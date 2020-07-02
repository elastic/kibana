/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, share } from 'rxjs/operators';
import { Observable, from } from 'rxjs';
import { TagsClientCreateParams } from '../../../../common';
import { TagsManagerParams } from './types';
import { TagList } from './tag_list';
import { Tag } from './tag';

export class TagManager {
  constructor(private readonly params: TagsManagerParams) {}

  private readonly list = new TagList(this.params);

  public readonly useInitializing = this.list.useInitializing;
  public readonly useTags = this.list.useData;
  public readonly useTag = this.list.useTag;

  public create$(params: TagsClientCreateParams): Observable<Tag> {
    const { tags: client } = this.params;
    return from(client.create(params)).pipe(
      share(),
      map((response) => {
        const tag = this.list.add(response.tag);
        return tag;
      })
    );
  }

  public delete$(ids: string[]): Observable<void> {
    const { tags: client } = this.params;
    const deletedTags = this.list.delete(ids);
    const promise = Promise.all(ids.map((id) => client.del({ id }))).then(() => undefined);
    const observable = from(promise).pipe(share());

    observable.subscribe({
      error: () => this.list.insert(deletedTags),
    });

    return observable;
  }
}
