/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, share, tap, switchMap, take } from 'rxjs/operators';
import { Observable, from, of } from 'rxjs';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { v4 as uuidv4 } from 'uuid';
import {
  RawTagWithId,
  TagsClientCreateParams,
  parseTag,
  TagsClientUpdateParams,
} from '../../../../common';
import { TagsManagerParams } from './types';
import { TagList } from './tag_list';
import { Tag } from './tag';
import { TagAttachments } from './tag_attachments';
import { Resources, Resource } from './resources';
import { TagAttachment } from './tag_attachment';

/* eslint-disable react-hooks/rules-of-hooks */

export class TagManager {
  constructor(private readonly params: TagsManagerParams) {}

  private readonly tags = new TagList(this.params);
  private readonly attachments = new TagAttachments();
  private readonly resources = new Resources();

  public readonly useInitializing = this.tags.useInitializing;
  public readonly useTags = this.tags.useData;
  public readonly useTag = this.tags.useTag;

  public readonly useTagsList = () => {
    const tagMap = this.useTags();
    const tagList = useMemo(() => Object.values(tagMap), [tagMap]);
    return tagList;
  };

  public create$(tag: Omit<TagsClientCreateParams['tag'], 'id'>): Observable<Tag> {
    const { tags: client } = this.params;

    // Add tag optimistically to UI.
    const id = uuidv4();
    const { key, value } = parseTag(tag.title);
    const at = new Date().toISOString();
    const optimisticTag: RawTagWithId = {
      id,
      createdAt: at,
      updatedAt: at,
      createdBy: '',
      updatedBy: '',
      enabled: true,
      key,
      value,
      ...tag,
    };
    this.tags.add([optimisticTag]);

    const observable = from(client.create({ tag: { ...tag, id } })).pipe(
      share(),
      map((response) => {
        const tags = this.tags.add([response.tag]);
        return tags[response.tag.id]!;
      })
    );

    // Remove optimistically created tag on error.
    observable.subscribe({
      error: (error) => {
        this.tags.remove([id]);
      },
    });

    return observable;
  }

  public update$(patch: TagsClientUpdateParams['patch']): Observable<RawTagWithId> {
    let oldData: Partial<RawTagWithId> = {};
    const observable = this.tags.tag$(patch.id).pipe(
      take(1),
      tap((tag) => {
        oldData = tag.data;
        tag.patch(patch);
      }),
      switchMap((tag) => from(this.params.tags.update({ patch })).pipe(share())),
      tap((response) => {
        this.tags.tag(patch.id)!.patch(response.patch);
      })
    );

    observable.subscribe(() => {});

    return this.tags.tagData$(patch.id);
  }

  private getAttachedTags$(kid: string) {
    return from(this.params.attachments.getAttachedTags({ kid })).pipe(
      share(),
      tap((response) => {
        this.tags.add(response.tags);
        this.attachments.add(response.attachments);
        const attachments = this.attachments.getMany(response.attachments.map(({ id }) => id));
        this.resources.set(
          kid,
          attachments.sort((a, b) => {
            const aTag = this.tags.tag(a.data.tagId);
            const bTag = this.tags.tag(b.data.tagId);
            if (!aTag || !bTag) return 0;
            return aTag.data.title > bTag.data.title ? 1 : -1;
          })
        );
      })
    );
  }

  public getResource$(kid: string): Observable<Resource> {
    const resource = this.resources.get(kid);
    if (resource) return of(resource);
    return this.getAttachedTags$(kid).pipe(map(() => this.resources.get(kid)!));
  }

  public getResourceDataAttachments$(kid: string): Observable<TagAttachment[]> {
    return this.getResource$(kid).pipe(switchMap((resource) => resource.attachments$));
  }

  public setAttachments$(kid: string, tagIds: string[]) {
    const observable = from(this.params.attachments.set({ kid, tagIds })).pipe(share());

    observable.subscribe(({ attachments }) => {
      const data = this.attachments.add(attachments);
      this.resources.set(
        kid,
        attachments
          .map(({ id }) => data[id])
          .sort((a, b) => {
            const aTag = this.tags.tag(a.data.tagId);
            const bTag = this.tags.tag(b.data.tagId);
            if (!aTag || !bTag) return 0;
            return aTag.data.title > bTag.data.title ? 1 : -1;
          })
      );
    });

    return observable;
  }

  public useResource(kid: string): TagAttachment[] {
    const observable = useMemo(() => this.getResourceDataAttachments$(kid), [kid]);
    return useObservable(observable, []);
  }

  public delete$(ids: string[]): Observable<void> {
    const { tags: client } = this.params;
    const deletedTags = this.tags.delete(ids);
    const promise = Promise.all(ids.map((id) => client.del({ id }))).then(() => undefined);
    const observable = from(promise).pipe(share());

    observable.subscribe({
      error: () => this.tags.insert(deletedTags),
    });

    return observable;
  }
}
