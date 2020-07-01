/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagAttachmentsClient, TagAttachmentsClientParams } from './tag_attachments_client';

export type TagAttachmentsServiceSetupParams = TagAttachmentsClientParams;

export class TagAttachmentsService {
  public client?: TagAttachmentsClient;

  setup(params: TagAttachmentsServiceSetupParams) {
    this.client = new TagAttachmentsClient(params);

    return {
      client: this.client,
    };
  }

  start() {
    return {
      client: this.client,
    };
  }
}

export type TagAttachmentsServiceSetup = ReturnType<TagAttachmentsService['setup']>;
export type TagAttachmentsServiceStart = ReturnType<TagAttachmentsService['start']>;
