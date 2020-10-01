/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { tagsApiPrefix, tagsInternalApiPrefix } from '../../common/constants';
import { Tag, TagAttributes, ITagsClient, TagWithRelations } from '../../common/types';

interface TagsClientOptions {
  http: HttpSetup;
}

interface FindTagsOptions {
  page?: number;
  perPage?: number;
  search?: string;
}

interface FindTagsResponse {
  tags: TagWithRelations[];
  total: number;
}

export interface ITagInternalClient extends ITagsClient {
  find(options: FindTagsOptions): Promise<FindTagsResponse>;
}

export class TagsClient implements ITagInternalClient {
  private readonly http: HttpSetup;

  constructor({ http }: TagsClientOptions) {
    this.http = http;
  }

  // public APIs from ITagsClient

  public async create(attributes: TagAttributes) {
    const { tag } = await this.http.post<{ tag: Tag }>(`${tagsApiPrefix}/create`, {
      body: JSON.stringify(attributes),
    });
    return tag;
  }

  public async get(id: string) {
    const { tag } = await this.http.get<{ tag: Tag }>(`${tagsApiPrefix}/${id}`);
    return tag;
  }

  public async getAll() {
    const { tags } = await this.http.get<{ tags: Tag[] }>(`${tagsApiPrefix}/get_all`);
    return tags;
  }

  public async delete(id: string) {
    await this.http.delete<{}>(`${tagsApiPrefix}/${id}`);
  }

  // internal APIs from ITagInternalClient

  public async find({ page, perPage, search }: FindTagsOptions) {
    return await this.http.get<FindTagsResponse>(`${tagsInternalApiPrefix}/_find`, {
      query: {
        page,
        perPage,
        search,
      },
    });
  }
}
