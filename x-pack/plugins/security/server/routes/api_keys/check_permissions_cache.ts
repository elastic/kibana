/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Duration } from 'moment';
import type { Observable } from 'rxjs';
import { BehaviorSubject, first, mergeMap, Subject, takeUntil } from 'rxjs';

import type { ApiKey } from '../../../common/model';

export interface IValidKeysChangeListener {
  onGetAll: (keys: ApiKey[]) => void;
}

type CacheRefreshHandler = () => ApiKey[] | Promise<ApiKey[]>;
interface ValidKeysCacheOptions {
  refreshHandler: CacheRefreshHandler;
  refreshInterval?: Duration;
}

export interface IValidKeysCache {
  /**
   * Returns the current state of the cache
   */
  getState(): ApiKey[];
  /**
   * Return an observable that will emit everytime the cache's state mutates.
   */
  getState$(): Observable<ApiKey[]>;
}

/** Creating similar to the Tags API to avoid performing http calls every time */
export class ValidKeysCache implements IValidKeysCache, IValidKeysChangeListener {
  private readonly refreshInterval?: Duration;
  private readonly refreshHandler: CacheRefreshHandler;
  private intervalId?: number;
  private readonly internal$: BehaviorSubject<ApiKey[]>;
  private readonly public$: Observable<ApiKey[]>;
  private readonly stop$: Subject<void>;
  private isInitialized$: BehaviorSubject<boolean>;

  constructor({ refreshHandler, refreshInterval }: ValidKeysCacheOptions) {
    this.refreshHandler = refreshHandler;
    this.refreshInterval = refreshInterval;

    this.stop$ = new Subject<void>();
    this.internal$ = new BehaviorSubject<ApiKey[]>([]);
    this.public$ = this.internal$.pipe(takeUntil(this.stop$));
    this.isInitialized$ = new BehaviorSubject<boolean>(false);
  }

  public async initialize() {
    await this.refresh();
    this.isInitialized$.next(true);

    if (this.refreshInterval) {
      this.intervalId = window.setInterval(() => {
        this.refresh();
      }, this.refreshInterval.asMilliseconds());
    }
  }

  private async refresh() {
    try {
      const keys = await this.refreshHandler();
      this.internal$.next(keys);
    } catch (e) {
      // what should we do here?
    }
  }

  public getState() {
    return this.internal$.getValue();
  }

  public getState$({ waitForInitialization = false }: { waitForInitialization?: boolean } = {}) {
    return waitForInitialization
      ? this.isInitialized$.pipe(
          first((isInitialized) => isInitialized),
          mergeMap(() => this.public$)
        )
      : this.public$;
  }

  public onUpdate(id: string) {
    this.internal$.next(
      this.internal$.value.map((key) => {
        if (key.id === id) {
          return {
            ...key,
          };
        }
        return key;
      })
    );
  }

  public onGetAll(keys: ApiKey[]) {
    this.internal$.next(keys);
  }

  public stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    this.stop$.next();
  }
}
