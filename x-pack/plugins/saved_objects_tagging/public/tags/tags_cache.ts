/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Tag, TagAttributes } from '../../common/types';

export interface ITagsCache {
  getState(): Tag[];
  getState$(): Observable<Tag[]>;
}

export interface ITagsChangeListener {
  onDelete: (id: string) => void;
  onCreate: (tag: Tag) => void;
  onUpdate: (id: string, attributes: TagAttributes) => void;
  onGetAll: (tags: Tag[]) => void;
}

type CacheRefreshHandler = () => Tag[] | Promise<Tag[]>;

/**
 * Reactive client-side cache of all the existing tags.
 *
 * Used mostly by the UI components to avoid performing http calls every time a component
 * needs to retrieve the list of all the existing tags.
 */
export class TagsCache implements ITagsCache, ITagsChangeListener {
  private readonly internal$: BehaviorSubject<Tag[]>;
  private readonly public$: Observable<Tag[]>;
  private readonly stop$: Subject<void>;

  constructor(private readonly refresher: CacheRefreshHandler) {
    this.stop$ = new Subject();
    this.internal$ = new BehaviorSubject<Tag[]>([]);
    this.public$ = this.internal$.pipe(takeUntil(this.stop$));
  }

  public async populate() {
    try {
      const tags = await this.refresher();
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
    this.internal$.next([...this.internal$.value, tag]);
  }

  public onUpdate(id: string, attributes: TagAttributes) {
    this.internal$.next(
      this.internal$.value.map((tag) => {
        if (tag.id === id) {
          return {
            ...tag,
            attributes,
          };
        }
        return tag;
      })
    );
  }

  public onGetAll(tags: Tag[]) {
    this.internal$.next(tags);
  }

  public destroy() {
    this.stop$.next();
  }
}
