/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsClientParams, TagsClient } from './tags_client';
import { TagsManager } from './tags_manager';

export type TagsServiceSetupParams = TagsClientParams;

export class TagsService {
  public client?: TagsClient;
  public manager?: TagsManager;

  setup(params: TagsServiceSetupParams) {
    this.client = new TagsClient(params);
    this.manager = new TagsManager({ client: this.client });

    return {
      client: this.client,
      manager: this.manager,
    };
  }

  start() {
    return {
      client: this.client,
      manager: this.manager,
    };
  }
}

export type TagsServiceSetup = ReturnType<TagsService['setup']>;
export type TagsServiceStart = ReturnType<TagsService['start']>;
