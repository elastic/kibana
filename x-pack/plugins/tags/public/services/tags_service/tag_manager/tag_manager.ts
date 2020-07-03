/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, share, tap, switchMap } from 'rxjs/operators';
import { Observable, from, of } from 'rxjs';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { TagsClientCreateParams } from '../../../../common';
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

  public create$(params: TagsClientCreateParams): Observable<Tag> {
    const { tags: client } = this.params;
    return from(client.create(params)).pipe(
      share(),
      map((response) => {
        const tags = this.tags.add([response.tag]);
        return tags[response.tag.id]!;
      })
    );
  }

  private getAttachedTags$(kid: string) {
    return from(this.params.attachments.getAttachedTags({ kid })).pipe(
      share(),
      tap((response) => {
        this.tags.add(response.tags);
        this.attachments.add(response.attachments);
        const attachments = this.attachments.getMany(response.attachments.map(({ id }) => id));
        this.resources.set(kid, attachments);
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
        attachments.map(({ id }) => data[id])
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
