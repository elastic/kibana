/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject } from 'rxjs';

export class FilePickerState {
  private readonly fileSet = new Set<string>();

  private sendNext() {
    this.size$.next(this.fileSet.size);
    this.fileIds$.next(this.getFileIds());
  }
  public fileIds$ = new BehaviorSubject<string[]>([]);
  public size$ = new BehaviorSubject<number>(0);

  public isEmpty() {
    return this.fileSet.size === 0;
  }

  public addFile = (fileId: string): void => {
    this.fileSet.add(fileId);
    this.sendNext();
  };

  public removeFile = (fileId: string): void => {
    if (this.fileSet.delete(fileId)) this.sendNext();
  };

  public hasFileId = (fileId: string): boolean => {
    return this.fileSet.has(fileId);
  };

  public getFileIds = (): string[] => {
    return Array.from(this.fileSet);
  };
}
