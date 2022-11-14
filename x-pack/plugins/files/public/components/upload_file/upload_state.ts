/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  of,
  map,
  zip,
  from,
  race,
  take,
  filter,
  Subject,
  finalize,
  forkJoin,
  mergeMap,
  switchMap,
  catchError,
  shareReplay,
  ReplaySubject,
  BehaviorSubject,
  type Observable,
  combineLatest,
  distinctUntilChanged,
  Subscription,
} from 'rxjs';
import type { FileKind, FileJSON } from '../../../common/types';
import type { FilesClient } from '../../types';
import { ImageMetadataFactory, getImageMetadata, isImage } from '../util';
import { i18nTexts } from './i18n_texts';

import { createStateSubject, type SimpleStateSubject, parseFileName } from './util';

interface FileState {
  file: File;
  status: 'idle' | 'uploading' | 'uploaded' | 'upload_failed';
  id?: string;
  error?: Error;
}

type Upload = SimpleStateSubject<FileState>;

interface DoneNotification {
  id: string;
  kind: string;
}

interface UploadOptions {
  allowRepeatedUploads?: boolean;
}

export class UploadState {
  private readonly abort$ = new Subject<void>();
  private readonly files$$ = new BehaviorSubject<Upload[]>([]);

  public readonly files$ = this.files$$.pipe(
    switchMap((files$) => (files$.length ? zip(...files$) : of([])))
  );
  public readonly clear$ = new Subject<void>();
  public readonly error$ = new BehaviorSubject<undefined | Error>(undefined);
  public readonly uploading$ = new BehaviorSubject(false);
  public readonly done$ = new Subject<undefined | DoneNotification[]>();

  private subscriptions: Subscription[];

  constructor(
    private readonly fileKind: FileKind,
    private readonly client: FilesClient,
    private readonly opts: UploadOptions = { allowRepeatedUploads: false },
    private readonly loadImageMetadata: ImageMetadataFactory = getImageMetadata
  ) {
    const latestFiles$ = this.files$$.pipe(switchMap((files$) => combineLatest(files$)));
    this.subscriptions = [
      latestFiles$
        .pipe(
          map((files) => files.some((file) => file.status === 'uploading')),
          distinctUntilChanged()
        )
        .subscribe(this.uploading$),

      latestFiles$
        .pipe(
          map((files) => {
            const errorFile = files.find((file) => Boolean(file.error));
            return errorFile ? errorFile.error : undefined;
          }),
          filter(Boolean)
        )
        .subscribe(this.error$),

      latestFiles$
        .pipe(
          filter(
            (files) => Boolean(files.length) && files.every((file) => file.status === 'uploaded')
          ),
          map((files) => files.map((file) => ({ id: file.id!, kind: this.fileKind.id })))
        )
        .subscribe(this.done$),
    ];
  }

  public isUploading(): boolean {
    return this.uploading$.getValue();
  }

  private validateFiles(files: File[]): undefined | string {
    if (
      this.fileKind.maxSizeBytes != null &&
      files.some((file) => file.size > this.fileKind.maxSizeBytes!)
    ) {
      return i18nTexts.fileTooLarge(String(this.fileKind.maxSizeBytes));
    }
    return;
  }

  public setFiles = (files: File[]): void => {
    if (this.isUploading()) {
      throw new Error('Cannot update files while uploading');
    }

    if (!files.length) {
      this.done$.next(undefined);
      this.error$.next(undefined);
    }

    const validationError = this.validateFiles(files);

    this.files$$.next(
      files.map((file) =>
        createStateSubject<FileState>({
          file,
          status: 'idle',
          error: validationError ? new Error(validationError) : undefined,
        })
      )
    );
  };

  public abort = (): void => {
    if (!this.isUploading()) {
      throw new Error('No upload in progress');
    }
    this.abort$.next();
  };

  clear = (): void => {
    this.setFiles([]);
    this.clear$.next();
  };

  /**
   * Do not throw from this method, it is intended to work with {@link forkJoin} from rxjs which
   * unsubscribes from all observables if one of them throws.
   */
  private uploadFile = (
    file$: SimpleStateSubject<FileState>,
    abort$: Observable<void>,
    meta?: unknown
  ): Observable<void | Error> => {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const { file, status } = file$.getValue();
    if (!['idle', 'upload_failed'].includes(status)) {
      return of(undefined);
    }

    let uploadTarget: undefined | FileJSON;

    file$.setState({ status: 'uploading', error: undefined });

    const { name } = parseFileName(file.name);
    const mime = file.type || undefined;
    const _meta = meta as Record<string, unknown>;

    return from(isImage(file) ? this.loadImageMetadata(file) : of(undefined)).pipe(
      mergeMap((imageMetadata) =>
        this.client.create({
          kind: this.fileKind.id,
          name,
          mimeType: mime,
          meta: imageMetadata ? { ...imageMetadata, ..._meta } : _meta,
        })
      ),
      mergeMap((result) => {
        uploadTarget = result.file;
        return race(
          abort$.pipe(
            map(() => {
              abortController.abort();
              throw new Error('Abort!');
            })
          ),
          this.client.upload({
            body: file,
            id: uploadTarget.id,
            kind: this.fileKind.id,
            abortSignal,
            selfDestructOnAbort: true,
            contentType: mime,
          })
        );
      }),
      map(() => {
        file$.setState({ status: 'uploaded', id: uploadTarget?.id });
      }),
      catchError((e) => {
        const isAbortError = e.message === 'Abort!';
        file$.setState({ status: 'upload_failed', error: isAbortError ? undefined : e });
        return of(isAbortError ? undefined : e);
      })
    );
  };

  public upload = (meta?: unknown): Observable<void> => {
    if (this.isUploading()) {
      throw new Error('Upload already in progress');
    }
    const abort$ = new ReplaySubject<void>(1);
    const sub = this.abort$.subscribe(abort$);
    const upload$ = this.files$$.pipe(
      take(1),
      switchMap((files$) => forkJoin(files$.map((file$) => this.uploadFile(file$, abort$, meta)))),
      map(() => undefined),
      finalize(() => {
        if (this.opts.allowRepeatedUploads) this.clear();
        sub.unsubscribe();
      }),
      shareReplay()
    );

    upload$.subscribe(); // Kick off the upload

    return upload$;
  };

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };
}

export const createUploadState = ({
  fileKind,
  client,
  imageMetadataFactory,
  ...options
}: {
  fileKind: FileKind;
  client: FilesClient;
  imageMetadataFactory?: ImageMetadataFactory;
} & UploadOptions) => {
  return new UploadState(fileKind, client, options, imageMetadataFactory);
};
