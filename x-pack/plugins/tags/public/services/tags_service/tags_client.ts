/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ITagsClient,
  TAGS_API_PATH,
  TagsClientCreateParams,
  TagsClientCreateResult,
  TagsClientReadParams,
  TagsClientReadResult,
  TagsClientGetAllResult,
  TagsClientDeleteParams,
  TagsClientUpdateParams,
  TagsClientUpdateResult,
} from '../../../common';
import { HttpSetup, HttpStart } from '../../../../../../src/core/public';

export interface TagsClientParams {
  http: HttpSetup | HttpStart;
}

export class TagsClient implements ITagsClient {
  private readonly path = TAGS_API_PATH;

  constructor(private readonly params: TagsClientParams) {}

  public async create(params: TagsClientCreateParams): Promise<TagsClientCreateResult> {
    return await this.params.http.post<TagsClientCreateResult>(`${this.path}/tag`, {
      body: JSON.stringify(params),
    });
  }

  public async read({ id }: TagsClientReadParams): Promise<TagsClientReadResult> {
    return await this.params.http.get<TagsClientReadResult>(`${this.path}/tag/${id}`);
  }

  public async update({ patch }: TagsClientUpdateParams): Promise<TagsClientUpdateResult> {
    const { id, ...rest } = patch;
    return await this.params.http.post<TagsClientUpdateResult>(`${this.path}/tag/${id}`, {
      body: JSON.stringify({ patch: rest }),
    });
  }

  public async del({ id }: TagsClientDeleteParams): Promise<void> {
    await this.params.http.delete<TagsClientGetAllResult>(`${this.path}/tag/${id}`);
  }

  public async getAll(): Promise<TagsClientGetAllResult> {
    return await this.params.http.get<TagsClientGetAllResult>(`${this.path}/tag`);
  }
}
