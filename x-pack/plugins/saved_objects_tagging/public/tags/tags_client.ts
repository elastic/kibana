/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { tagsApiPrefix } from '../../common/constants';
import { Tag, TagAttributes, ITagsClient } from '../../common/types';

interface TagsClientOptions {
  http: HttpSetup;
}

type InternalTagClient = ITagsClient;

export class TagsClient implements InternalTagClient {
  private readonly http: HttpSetup;

  constructor({ http }: TagsClientOptions) {
    this.http = http;
  }

  public async create(attributes: TagAttributes) {
    const { tag } = await this.http.post<{ tag: Tag }>(`${tagsApiPrefix}/create`, {
      body: JSON.stringify(attributes),
    });
    return tag;
  }

  public async get(id: string): Promise<Tag> {
    const { tag } = await this.http.get<{ tag: Tag }>(`${tagsApiPrefix}/${id}`);
    return tag;
  }

  public async getAll(): Promise<Tag[]> {
    const { tags } = await this.http.get<{ tags: Tag[] }>(`${tagsApiPrefix}/get_all`);
    return tags;
  }

  public async delete(id: string): Promise<void> {
    await this.http.delete<{}>(`${tagsApiPrefix}/${id}`);
  }
}
