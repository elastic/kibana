/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  of,
  map,
  tap,
  zip,
  from,
  race,
  take,
  Subject,
  finalize,
  forkJoin,
  mergeMap,
  switchMap,
  catchError,
  ReplaySubject,
  BehaviorSubject,
  type Observable,
} from 'rxjs';
import type { FileKind, FileJSON } from '../../../common/types';
import type { FilesClient } from '../../types';
import { i18nTexts } from './i18n_texts';

import { createStateSubject, type SimpleStateSubject } from './simple_state_subject';

const prop$ = <T = unknown>(initialValue: T) => new BehaviorSubject<T>(initialValue);

interface FileState {
  file: File;
  status: 'idle' | 'uploading' | 'uploaded';
  id?: string;
  error?: Error;
}

export class UploadState {
  private readonly abort$ = new Subject<void>();
  private readonly files$$ = prop$<Array<SimpleStateSubject<FileState>>>([]);

  public readonly files$ = this.files$$.pipe(
    switchMap((files$) => (files$.length ? zip(...files$) : of([])))
  );

  public readonly uploading$ = prop$(false);

  constructor(private readonly fileKind: FileKind, private readonly client: FilesClient) {}

  public isUploading(): boolean {
    return this.uploading$.getValue();
  }

  private validateFiles(files: File[]): undefined | string {
    if (
      this.fileKind.maxSizeBytes != null &&
      files.some((file) => file.size > this.fileKind.maxSizeBytes!)
    ) {
      return i18nTexts.fileTooLarge;
    }
    return;
  }

  public setFiles = (files: File[]): void => {
    if (this.isUploading()) {
      throw new Error('Cannot update files while uploading');
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

  /**
   * Do not throw from this method, it is intended to work with {@link forkJoin} from rxjs which
   * unsubscribes from all observables if one of them throws.
   */
  private uploadFile = (
    file$: SimpleStateSubject<FileState>,
    abort$: Observable<void>
  ): Observable<void | Error> => {
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const { file, status } = file$.getValue();
    if (status !== 'idle') {
      return of(undefined);
    }

    let uploadTarget: undefined | FileJSON;
    let erroredOrAborted = false;

    file$.setState({ status: 'uploading', error: undefined });

    return from(
      this.client.create({
        kind: this.fileKind.id,
        name: file.name,
      })
    ).pipe(
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
          })
        );
      }),
      tap(() => {
        file$.setState({ status: 'uploaded', id: uploadTarget?.id });
      }),
      catchError((e) => {
        erroredOrAborted = true;
        file$.setState({ status: 'idle', error: e.message === 'Abort!' ? undefined : e });
        return of(e);
      }),
      finalize(() => {
        if (erroredOrAborted && uploadTarget) {
          this.client.delete({ id: uploadTarget.id, kind: this.fileKind.id });
        }
      })
    );
  };

  public upload = (): Observable<void> => {
    if (this.isUploading()) {
      throw new Error('Upload already in progress');
    }
    this.uploading$.next(true);
    const abort$ = new ReplaySubject<void>(1);
    const sub = this.abort$.subscribe(abort$);
    return this.files$$.pipe(
      take(1),
      switchMap((files$) => {
        return forkJoin(files$.map((file$) => this.uploadFile(file$, abort$)));
      }),
      map((results) => {
        const errors = results.filter(Boolean) as Error[];
        if (errors.length) {
          throw errors[0]; // Throw just the first error for now
        }
      }),
      finalize(() => {
        this.uploading$.next(false);
        sub.unsubscribe();
      })
    );
  };
}

export const createUploadState = ({
  fileKind,
  client,
}: {
  fileKind: FileKind;
  client: FilesClient;
}) => {
  return new UploadState(fileKind, client);
};
