/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ITagsCache } from '../../../../../../src/plugins/saved_objects_tagging_oss/public';
import { Tag, TagAttributes } from '../../../common/types';

export type { ITagsCache };

export interface ITagsChangeListener {
  onDelete: (id: string) => void;
  onCreate: (tag: Tag) => void;
  onUpdate: (id: string, attributes: TagAttributes) => void;
  onGetAll: (tags: Tag[]) => void;
}

export type CacheRefreshHandler = () => Tag[] | Promise<Tag[]>;

interface TagsCacheOptions {
  refreshHandler: CacheRefreshHandler;
  refreshInterval?: Duration;
}

/**
 * Reactive client-side cache of the existing tags, connected to the TagsClient.
 *
 * Used (mostly) by the UI components to avoid performing http calls every time a component
 * needs to retrieve the list of all the existing tags or the tags associated with an object.
 */
export class TagsCache implements ITagsCache, ITagsChangeListener {
  private readonly refreshInterval?: Duration;
  private readonly refreshHandler: CacheRefreshHandler;

  private intervalId?: number;
  private readonly internal$: BehaviorSubject<Tag[]>;
  private readonly public$: Observable<Tag[]>;
  private readonly stop$: Subject<void>;

  constructor({ refreshHandler, refreshInterval }: TagsCacheOptions) {
    this.refreshHandler = refreshHandler;
    this.refreshInterval = refreshInterval;

    this.stop$ = new Subject<void>();
    this.internal$ = new BehaviorSubject<Tag[]>([]);
    this.public$ = this.internal$.pipe(takeUntil(this.stop$));
  }

  public async initialize() {
    await this.refresh();

    if (this.refreshInterval) {
      this.intervalId = window.setInterval(() => {
        this.refresh();
      }, this.refreshInterval.asMilliseconds());
    }
  }

  private async refresh() {
    try {
      const tags = await this.refreshHandler();
      this.internal$.next(tags);
    } catch (e) {
      // what should we do here?
    }
  }

  public getState() {
    return this.internal$.getValue();
  }

  public getState$() {
    return this.public$;
  }

  public onDelete(id: string) {
    this.internal$.next(this.internal$.value.filter((tag) => tag.id !== id));
  }

  public onCreate(tag: Tag) {
    this.internal$.next([...this.internal$.value.filter((f) => f.id !== tag.id), tag]);
  }

  public onUpdate(id: string, attributes: TagAttributes) {
    this.internal$.next(
      this.internal$.value.map((tag) => {
        if (tag.id === id) {
          return {
            ...tag,
            ...attributes,
          };
        }
        return tag;
      })
    );
  }

  public onGetAll(tags: Tag[]) {
    this.internal$.next(tags);
  }

  public stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
    }
    this.stop$.next();
  }
}
