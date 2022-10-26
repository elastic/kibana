/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  map,
  tap,
  from,
  switchMap,
  Observable,
  shareReplay,
  debounceTime,
  Subscription,
  combineLatest,
  BehaviorSubject,
  distinctUntilChanged,
} from 'rxjs';
import { FileJSON } from '../../../common';
import { FilesClient } from '../../types';

function naivelyFuzzify(query: string): string {
  return query.includes('*') ? query : `*${query}*`;
}

export class FilePickerState {
  /**
   * Files the user has selected
   */
  public readonly selectedFileIds$ = new BehaviorSubject<string[]>([]);

  public readonly isLoading$ = new BehaviorSubject<boolean>(true);
  public readonly loadingError$ = new BehaviorSubject<undefined | Error>(undefined);
  public readonly hasFiles$ = new BehaviorSubject<boolean>(false);
  public readonly hasQuery$ = new BehaviorSubject<boolean>(false);
  public readonly query$ = new BehaviorSubject<undefined | string>(undefined);
  public readonly queryDebounced$ = this.query$.pipe(debounceTime(100));
  public readonly currentPage$ = new BehaviorSubject<number>(0);
  public readonly totalPages$ = new BehaviorSubject<undefined | number>(undefined);

  /**
   * This is how we keep a deduplicated list of file ids representing files a user
   * has selected
   */
  private readonly fileSet = new Set<string>();
  private readonly retry$ = new BehaviorSubject<void>(undefined);
  private readonly subscriptions: Subscription[] = [];
  private readonly internalIsLoading$ = new BehaviorSubject<boolean>(true);

  constructor(
    private readonly client: FilesClient,
    private readonly kind: string,
    public readonly pageSize: number
  ) {
    this.subscriptions = [
      this.query$
        .pipe(
          tap(() => this.setIsLoading(true)),
          map((query) => Boolean(query)),
          distinctUntilChanged()
        )
        .subscribe(this.hasQuery$),
      this.requests$.pipe(tap(() => this.setIsLoading(true))).subscribe(),
      this.internalIsLoading$
        .pipe(debounceTime(100), distinctUntilChanged())
        .subscribe(this.isLoading$),
    ];
  }

  private readonly requests$ = combineLatest([
    this.currentPage$.pipe(distinctUntilChanged()),
    this.query$.pipe(distinctUntilChanged(), debounceTime(100)),
    this.retry$,
  ]);

  /**
   * File objects we have loaded on the front end, stored here so that it can
   * easily be passed to all relevant UI.
   *
   * @note This is not explicitly kept in sync with the selected files!
   * @note This is not explicitly kept in sync with the selected files!
   */
  public readonly files$ = this.requests$.pipe(
    switchMap(([page, query]) => this.sendRequest(page, query)),
    tap(({ total }) => this.updateTotalPages({ total })),
    tap(({ total }) => this.hasFiles$.next(Boolean(total))),
    map(({ files }) => files),
    shareReplay()
  );

  private updateTotalPages = ({ total }: { total: number }): void => {
    this.totalPages$.next(Math.ceil(total / this.pageSize));
  };

  private sendNextSelectedFiles() {
    this.selectedFileIds$.next(this.getSelectedFileIds());
  }

  private setIsLoading(value: boolean) {
    this.internalIsLoading$.next(value);
  }

  public selectFile = (fileId: string | string[]): void => {
    (Array.isArray(fileId) ? fileId : [fileId]).forEach((id) => this.fileSet.add(id));
    this.sendNextSelectedFiles();
  };

  private abort: undefined | (() => void) = undefined;
  private sendRequest = (
    page: number,
    query: undefined | string
  ): Observable<{ files: FileJSON[]; total: number }> => {
    if (this.abort) this.abort();
    this.setIsLoading(true);
    this.loadingError$.next(undefined);

    const abortController = new AbortController();
    this.abort = () => {
      try {
        abortController.abort();
      } catch (e) {
        // ignore
      }
    };

    const request$ = from(
      this.client.list({
        kind: this.kind,
        name: query ? [naivelyFuzzify(query)] : undefined,
        page: page + 1,
        status: ['READY'],
        perPage: this.pageSize,
        abortSignal: abortController.signal,
      })
    ).pipe(
      tap(() => {
        this.setIsLoading(false);
        this.abort = undefined;
      }),
      shareReplay()
    );

    request$.subscribe({
      error: (e: Error) => {
        if (e.name === 'AbortError') return;
        this.setIsLoading(false);
        this.loadingError$.next(e);
      },
    });

    return request$;
  };

  public retry = (): void => {
    this.retry$.next();
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
    this.currentPage$.next(0);
  };

  public setPage = (page: number): void => {
    this.currentPage$.next(page);
  };

  public dispose = (): void => {
    for (const sub of this.subscriptions) sub.unsubscribe();
  };

  watchFileSelected$ = (id: string): Observable<boolean> => {
    return this.selectedFileIds$.pipe(
      map(() => this.fileSet.has(id)),
      distinctUntilChanged()
    );
  };
}

interface CreateFilePickerArgs {
  client: FilesClient;
  kind: string;
  pageSize: number;
}
export const createFilePickerState = ({
  pageSize,
  client,
  kind,
}: CreateFilePickerArgs): FilePickerState => {
  return new FilePickerState(client, kind, pageSize);
};
