/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  Tag,
  TagAttributes,
  GetAllTagsOptions,
  ITagsClient,
  TagWithRelations,
} from '../../../common/types';
import { ITagsChangeListener } from './tags_cache';

export interface TagsClientOptions {
  http: HttpSetup;
  changeListener?: ITagsChangeListener;
}

export interface FindTagsOptions {
  page?: number;
  perPage?: number;
  search?: string;
}

export interface FindTagsResponse {
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
  bulkDelete(ids: string[]): Promise<void>;
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
    const { tag } = await this.http.post<{ tag: Tag }>('/api/saved_objects_tagging/tags/create', {
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
    const { tag } = await this.http.post<{ tag: Tag }>(`/api/saved_objects_tagging/tags/${id}`, {
      body: JSON.stringify(attributes),
    });

    trapErrors(() => {
      if (this.changeListener) {
        const { id: newId, ...newAttributes } = tag;
        this.changeListener.onUpdate(newId, newAttributes);
      }
    });

    return tag;
  }

  public async get(id: string) {
    const { tag } = await this.http.get<{ tag: Tag }>(`/api/saved_objects_tagging/tags/${id}`);
    return tag;
  }

  public async getAll({ asSystemRequest }: GetAllTagsOptions = {}) {
    const fetchOptions = { asSystemRequest };
    const { tags } = await this.http.get<{ tags: Tag[] }>(
      '/api/saved_objects_tagging/tags',
      fetchOptions
    );

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onGetAll(tags);
      }
    });

    return tags;
  }

  public async delete(id: string) {
    await this.http.delete<{}>(`/api/saved_objects_tagging/tags/${id}`);

    trapErrors(() => {
      if (this.changeListener) {
        this.changeListener.onDelete(id);
      }
    });
  }

  // internal APIs from ITagInternalClient

  public async find({ page, perPage, search }: FindTagsOptions) {
    return await this.http.get<FindTagsResponse>('/internal/saved_objects_tagging/tags/_find', {
      query: {
        page,
        perPage,
        search,
      },
    });
  }

  public async bulkDelete(tagIds: string[]) {
    await this.http.post<{}>('/internal/saved_objects_tagging/tags/_bulk_delete', {
      body: JSON.stringify({
        ids: tagIds,
      }),
    });

    trapErrors(() => {
      if (this.changeListener) {
        tagIds.forEach((tagId) => {
          this.changeListener!.onDelete(tagId);
        });
      }
    });
  }
}
