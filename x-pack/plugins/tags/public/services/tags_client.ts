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
} from '../../common';
import { HttpSetup, HttpStart } from '../../../../../src/core/public';

export interface Params {
  http: HttpSetup | HttpStart;
}

export class TagsClient implements ITagsClient {
  constructor(private readonly params: Params) {}

  public async create(params: TagsClientCreateParams): Promise<TagsClientCreateResult> {
    return await this.params.http.post<TagsClientCreateResult>(TAGS_API_PATH, {
      body: JSON.stringify(params),
    });
  }
}
