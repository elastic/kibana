/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BehaviorSubject, distinctUntilChanged, map, Subscription, combineLatest } from 'rxjs';
import { debounce } from 'lodash';
import { FileJSON } from '../../../common';

const filterFiles = (files: FileJSON[], filter?: string) => {
  if (!filter) return files;

  return files.filter((file) => {
    return file.name.toLowerCase().includes(filter);
  });
};

export class FilePickerState {
  /**
   * Files the user has selected
   */
  public readonly selectedFileIds$ = new BehaviorSubject<string[]>([]);

  /**
   * File objects we have loaded on the front end, stored here so that it can
   * easily be passed to all relevant UI.
   *
   * @note This is not explicitly kept in sync with the selected files!
   */
  public readonly files$ = new BehaviorSubject<FileJSON[]>([]);
  public readonly hasFiles$ = new BehaviorSubject<boolean>(false);

  /**
   * This is how we keep a deduplicated list of file ids representing files a user
   * has selected
   */
  private readonly fileSet = new Set<string>();

  private readonly unfilteredFiles$ = new BehaviorSubject<FileJSON[]>([]);
  private readonly query$ = new BehaviorSubject<undefined | string>(undefined);
  private readonly subscriptions: Subscription[] = [];

  constructor() {
    this.subscriptions = [
      this.unfilteredFiles$
        .pipe(
          map((files) => files.length > 0),
          distinctUntilChanged()
        )
        .subscribe(this.hasFiles$),

      combineLatest([this.unfilteredFiles$, this.query$])
        .pipe(map(([files, query]) => filterFiles(files, query)))
        .subscribe(this.files$),
    ];
  }

  private sendNextSelectedFiles() {
    this.selectedFileIds$.next(this.getSelectedFileIds());
  }

  public hasFilesSelected = (): boolean => {
    return this.fileSet.size > 0;
  };

  public selectFile = (fileId: string | string[]): void => {
    (Array.isArray(fileId) ? fileId : [fileId]).forEach((id) => this.fileSet.add(id));
    this.sendNextSelectedFiles();
  };

  public unselectFile = (fileId: string): void => {
    if (this.fileSet.delete(fileId)) this.sendNextSelectedFiles();
  };

  public isFileIdSelected = (fileId: string): boolean => {
    return this.fileSet.has(fileId);
  };

  public getSelectedFileIds = (): string[] => {
    return Array.from(this.fileSet);
  };

  public hasFiles = (): boolean => {
    return Boolean(this.files$.getValue().length);
  };

  public setFiles = (files: FileJSON[]): void => {
    this.unfilteredFiles$.next(files);
  };

  public setQuery = debounce((query: string): void => {
    if (query) this.query$.next(query);
    else this.query$.next(undefined);
  }, 100);

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };
}

export const createFilePickerState = (): FilePickerState => {
  return new FilePickerState();
};
