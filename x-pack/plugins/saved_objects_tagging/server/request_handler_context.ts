/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { RequestHandlerContext } from 'src/core/server';
import { ITagsClient } from '../common/types';
import { ITagsRequestHandlerContext } from './types';
import { TagsClient } from './tags';

export class TagsRequestHandlerContext implements ITagsRequestHandlerContext {
  #client?: ITagsClient;

  constructor(private readonly coreContext: RequestHandlerContext['core']) {}

  public get tagsClient() {
    if (this.#client == null) {
      this.#client = new TagsClient({ client: this.coreContext.savedObjects.client });
    }
    return this.#client;
  }
}
