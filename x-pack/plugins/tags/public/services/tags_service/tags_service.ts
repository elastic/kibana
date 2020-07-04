/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PublicContract } from '@kbn/utility-types';
import { TagsClientParams, TagsClient } from './tags_client';
import { TagManager } from './tag_manager';
import { TagAttachmentsClient } from './tag_attachments_client';

export type TagsServiceSetupParams = TagsClientParams;

export class TagsService {
  public tags?: TagsClient;
  public attachments?: TagAttachmentsClient;
  public manager?: TagManager;

  setup(params: TagsServiceSetupParams): TagsServiceContract {
    const tags = (this.tags = new TagsClient(params));
    const attachments = (this.attachments = new TagAttachmentsClient(params));
    this.manager = new TagManager({ tags, attachments });

    return this;
  }
}

export type TagsServiceContract = PublicContract<Omit<TagsService, 'setup'>>;
