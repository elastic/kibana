/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  map,
  debounceTime,
  Subscription,
  combineLatest,
  BehaviorSubject,
  distinctUntilChanged,
  Observable,
  from,
  finalize,
  shareReplay,
} from 'rxjs';
import { FileJSON } from '../../../common';
import { FilesClient } from '../../types';

const filterFiles = (files: FileJSON[], filter?: string) => {
  if (!filter) return files;
  const lowerFilter = filter.toLowerCase();
  return files.filter((file) => {
    return file.name.toLowerCase().includes(lowerFilter);
  });
};

const getFilteredCount = (unfilteredCount: number, filteredCount: number) =>
  unfilteredCount - filteredCount;

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
  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
  public readonly loadingError$ = new BehaviorSubject<undefined | Error>(undefined);
  public readonly hasFiles$ = new BehaviorSubject<boolean>(false);
  public readonly query$ = new BehaviorSubject<undefined | string>(undefined);

  private pageSize$: BehaviorSubject<number>;
  /**
   * This is how we keep a deduplicated list of file ids representing files a user
   * has selected
   */
  private readonly fileSet = new Set<string>();
  private readonly unfilteredFiles$ = new BehaviorSubject<FileJSON[]>([]);
  private readonly subscriptions: Subscription[] = [];

  constructor(
    private readonly client: FilesClient,
    private readonly kind: string,
    private readonly initialPageSize: number
  ) {
    this.pageSize$ = new BehaviorSubject<number>(this.initialPageSize);
    this.subscriptions = [
      this.unfilteredFiles$
        .pipe(
          map((files) => files.length > 0),
          distinctUntilChanged()
        )
        .subscribe(this.hasFiles$),

      combineLatest([this.unfilteredFiles$, this.query$.pipe(debounceTime(100))])
        .pipe(map(([files, query]) => filterFiles(files, query)))
        .subscribe(this.files$),
    ];
  }

  private sendNextSelectedFiles() {
    this.selectedFileIds$.next(this.getSelectedFileIds());
  }

  public selectFile = (fileId: string | string[]): void => {
    (Array.isArray(fileId) ? fileId : [fileId]).forEach((id) => this.fileSet.add(id));
    this.sendNextSelectedFiles();
  };

  private loadFiles = (pageSize: number): Observable<void> => {
    return from(this.client.list({ kind: this.kind, page: 1, perPage: pageSize })).pipe(
      map(({ files }) => {
        this.unfilteredFiles$.next(files);
        this.pageSize$.next(pageSize);
      }),
      shareReplay()
    );
  };

  public load = (): Observable<void> => {
    this.isLoading$.next(true);
    this.loadingError$.next(undefined);
    const request$ = this.loadFiles(this.initialPageSize).pipe(
      finalize(() => this.isLoading$.next(false))
    );
    request$.subscribe({ error: (e) => this.loadingError$.next(e) });
    return request$;
  };

  public loadMore = (): Observable<void> => {
    return this.loadFiles(this.pageSize$.getValue() + this.initialPageSize);
  };

  public hasFilesSelected = (): boolean => {
    return this.fileSet.size > 0;
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

  public setQuery = (query: undefined | string): void => {
    if (query) this.query$.next(query);
    else this.query$.next(undefined);
  };

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };
}

interface CreateFilePickerArgs {
  client: FilesClient;
  kind: string;
  initialPageSize: number;
}
export const createFilePickerState = ({
  initialPageSize,
  client,
  kind,
}: CreateFilePickerArgs): FilePickerState => {
  return new FilePickerState(client, kind, initialPageSize);
};
