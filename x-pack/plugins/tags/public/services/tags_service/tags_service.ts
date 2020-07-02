/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsClientParams, TagsClient } from './tags_client';
import { TagManager } from './tag_manager';
import { TagAttachmentsClient } from './tag_attachments_client';

export type TagsServiceSetupParams = TagsClientParams;

export class TagsService {
  public tags?: TagsClient;
  public attachments?: TagAttachmentsClient;
  public manager?: TagManager;

  setup(params: TagsServiceSetupParams) {
    const tags = (this.tags = new TagsClient(params));
    const attachments = (this.attachments = new TagAttachmentsClient(params));
    const manager = (this.manager = new TagManager({ tags, attachments }));

    return {
      tags,
      attachments,
      manager,
    };
  }

  start() {
    return {
      tags: this.tags!,
      attachments: this.attachments!,
      manager: this.manager!,
    };
  }
}

export type TagsServiceSetup = ReturnType<TagsService['setup']>;
export type TagsServiceStart = ReturnType<TagsService['start']>;
