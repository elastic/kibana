/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagsClient } from '../../../common';
import { TagsClient } from './tags_client';

export interface TagsManagerParams {
  client: ITagsClient;
}

export class TagsManager {
  constructor(private readonly params: TagsManagerParams) {}
}
