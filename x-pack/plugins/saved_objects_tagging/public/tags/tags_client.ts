/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { tagsApiPrefix, tagsInternalApiPrefix } from '../../common/constants';
import { Tag, TagAttributes, ITagsClient, TagWithRelations } from '../../common/types';
import { ITagsChangeListener } from './tags_cache';

interface TagsClientOptions {
  http: HttpSetup;
  changeListener?: ITagsChangeListener;
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

const trapErrors = (fn: () => void) => {
  try {
    fn();
  } catch (e) {
    // trap
  }
};

export interface ITagInternalClient extends ITagsClient {
  find(options: FindTagsOptions): Promise<FindTagsResponse>;
}

export class TagsClient implements ITagInternalClient {
  private readonly http: HttpSetup;
  private readonly changeListener?: ITagsChangeListener;

  constructor({ http, changeListener }: TagsClientOptions) {
    this.http = http;
    this.changeListener = changeListener;
  }

  // public APIs from ITagsClient

  public async create(attributes: TagAttributes) {
    const { tag } = await this.http.post<{ tag: Tag }>(`${tagsApiPrefix}/create`, {
      body: JSON.stringify(attributes),
    });

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onCreate(tag);
      }
    });

    return tag;
  }

  public async update(id: string, attributes: TagAttributes) {
    const { tag } = await this.http.post<{ tag: Tag }>(`${tagsApiPrefix}/${id}`, {
      body: JSON.stringify(attributes),
    });

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onUpdate(id, attributes);
      }
    });

    return tag;
  }

  public async get(id: string) {
    const { tag } = await this.http.get<{ tag: Tag }>(`${tagsApiPrefix}/${id}`);
    return tag;
  }

  public async getAll() {
    const { tags } = await this.http.get<{ tags: Tag[] }>(`${tagsApiPrefix}/get_all`);

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onGetAll(tags);
      }
    });

    return tags;
  }

  public async delete(id: string) {
    await this.http.delete<{}>(`${tagsApiPrefix}/${id}`);

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onDelete(id);
      }
    });
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
