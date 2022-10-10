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
    this.fileIds$.next(this.getFileIds());
  }
  public fileIds$ = new BehaviorSubject<string[]>([]);

  public isEmpty() {
    return this.fileSet.size === 0;
  }

  public addFile = (fileId: string | string[]): void => {
    (Array.isArray(fileId) ? fileId : [fileId]).forEach((id) => this.fileSet.add(id));
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

export const createFilePickerState = (): FilePickerState => {
  return new FilePickerState();
};
