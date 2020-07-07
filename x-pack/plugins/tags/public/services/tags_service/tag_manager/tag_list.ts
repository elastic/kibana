/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { useMemo } from 'react';
import { BehaviorSubject, Observable, of, throwError, iif } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import useObservable from 'react-use/lib/useObservable';
import { RawTagWithId } from '../../../../common';
import { Tag } from './tag';
import { TagsManagerParams } from './types';

export type TagMap = Record<string, Tag>;

export type TagListState = 'start' | 'loading' | 'reloading' | 'error' | 'data';

export class TagList {
  constructor(private readonly params: TagsManagerParams) {}

  public readonly state$ = new BehaviorSubject<TagListState>('start');

  public readonly error$ = new BehaviorSubject<Error | null>(null);

  private readonly data$$ = new BehaviorSubject<TagMap>({});
  public get data$(): BehaviorSubject<TagMap> {
    if (this.state$.getValue() === 'start') {
      this.state$.next('loading');
      this.params.tags.getAll().then(
        (response) => {
          const tags: Record<string, Tag> = {};
          for (const rawTag of response.tags) tags[rawTag.id] = new Tag(rawTag);
          this.data$$.next(tags);
          this.state$.next('data');
        },
        (error) => {
          this.error$.next(error);
          this.state$.next('error');
        }
      );
    }
    return this.data$$;
  }

  public get data() {
    return this.data$$.getValue();
  }

  public tag(tagId: string): Tag | undefined {
    const { data } = this;
    if (!data.hasOwnProperty(tagId)) return undefined;
    return data[tagId];
  }

  public readonly initializing$ = this.state$.pipe(
    map((state) => state === 'start' || state === 'loading')
  );

  public tag$(tagId: string): Observable<Tag> {
    return this.data$.pipe(
      map((tags) => {
        const tag = tags[tagId];
        if (!tag) throw new Error('Tag not found.');
        return tag;
      })
    );
  }

  public tagData$(tagId: string): Observable<RawTagWithId> {
    return this.tag$(tagId).pipe(switchMap((tag) => tag.data$));
  }

  public add(rawTags: RawTagWithId[]): TagMap {
    const newTags: TagMap = {};
    for (const rawTag of rawTags) {
      const tag = new Tag(rawTag);
      newTags[tag.id] = tag;
    }
    const data = { ...this.data$$.getValue(), ...newTags };
    this.data$$.next(data);
    return data;
  }

  public remove(tagIds: string[]): TagMap {
    const { data } = this;
    const newData: TagMap = {};
    for (const tag of Object.values(data)) if (tagIds.indexOf(tag.id) === -1) newData[tag.id] = tag;
    this.data$$.next(newData);
    return newData;
  }

  public delete(ids: string[]): Tag[] {
    const tags = this.data$$.getValue();
    const newTags: TagMap = {};
    const deletedTags: Tag[] = [];
    for (const tag of Object.values(tags))
      if (!ids.includes(tag.id)) newTags[tag.id] = tag;
      else deletedTags.push(tag);
    this.data$$.next(newTags);
    return deletedTags;
  }

  public insert(tags: Tag[]) {
    const oldTags = this.data$$.getValue();
    const newTags: TagMap = {};
    for (const tag of tags) newTags[tag.id] = tag;
    this.data$$.next({ ...oldTags, ...newTags });
  }

  public readonly useInitializing = () => {
    return useObservable(this.initializing$, true);
  };

  public readonly useData = () => {
    const observable = useMemo(() => this.data$, []);
    return useObservable(observable, observable.getValue());
  };

  public readonly useTag = (tagId: string): RawTagWithId | null => {
    const observable = useMemo(() => this.tagData$(tagId), [tagId]);
    return useObservable(observable, null);
  };
}
