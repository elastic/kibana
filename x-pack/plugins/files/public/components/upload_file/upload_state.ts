/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BehaviorSubject,
  ReplaySubject,
  type Observable,
  of,
  from,
  forkJoin,
  type Subscription,
} from 'rxjs';
import { take, map, switchMap, mergeMap, finalize, catchError } from 'rxjs/operators';
import type { FileKind, FileJSON } from '../../../common/types';
import type { FilesClient } from '../../types';

const prop$ = <T = unknown>(initialValue: T) => new BehaviorSubject<T>(initialValue);

interface FileState {
  file: File;
  status: 'idle' | 'uploading' | 'uploaded';
  error?: Error;
}

export class UploadState {
  private readonly abort$ = new ReplaySubject(1);
  private readonly error$ = prop$<undefined | Error>(undefined);

  public readonly files$ = prop$<Array<BehaviorSubject<FileState>>>([]);
  public readonly uploading$ = prop$(false);

  constructor(private readonly fileKind: FileKind, private readonly client: FilesClient) {}

  public isUploading(): boolean {
    return this.uploading$.getValue();
  }

  public setFiles = (files: File[]): void => {
    if (this.isUploading()) {
      throw new Error('Cannot update files while uploading');
    }
    this.files$.next(files.map((file) => new BehaviorSubject<FileState>({ file, status: 'idle' })));
    this.error$.next(undefined);
  };

  public abort(): void {
    if (this.isUploading()) {
      throw new Error('No upload in progress');
    }
    this.abort$.next(undefined);
  }

  private uploadFile = (file$: BehaviorSubject<FileState>): Observable<void> => {
    const { file, status } = file$.getValue();
    if (status !== 'idle') {
      return of(undefined);
    }
    let uploadTarget: undefined | FileJSON;
    file$.next({ ...file$.getValue(), status: 'uploading' });
    return from(
      this.client.create({
        kind: this.fileKind.id,
        name: file.name,
      })
    ).pipe(
      mergeMap((result) => {
        uploadTarget = result.file;
        return this.client.upload({ body: file, id: uploadTarget.id, kind: this.fileKind.id });
      }),
      map(() => file$.next({ ...file$.getValue(), status: 'uploaded' })),
      catchError(async (e) => {
        if (uploadTarget) {
          await this.client.delete({ id: uploadTarget.id, kind: this.fileKind.id });
        }
        file$.next({ ...file$.getValue(), error: e });
      })
    );
  };

  public upload = (): Observable<void> => {
    if (this.isUploading()) {
      throw new Error('Upload already in progress');
    }
    this.uploading$.next(true);
    let sub: Subscription;
    const upload$ = this.files$.pipe(
      take(1),
      switchMap((files) => forkJoin(files.map(this.uploadFile))),
      map(() => {}),
      finalize(() => {
        this.uploading$.next(false);
        sub.unsubscribe();
      })
    );
    sub = upload$.subscribe();

    return upload$;
  };
}
