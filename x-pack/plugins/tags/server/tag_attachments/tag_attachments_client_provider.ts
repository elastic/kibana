/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagAttachmentsClient, TagAttachmentsClientParams } from './tag_attachments_client';

export class TagAttachmentsClientProvider {
  constructor(private readonly initParams: Pick<TagAttachmentsClientParams, 'logger'>) {}

  public readonly create = (
    remainingParams: Pick<TagAttachmentsClientParams, 'savedObjectsClient' | 'user' | 'tagsClient'>
  ): TagAttachmentsClient => {
    return new TagAttachmentsClient({ ...this.initParams, ...remainingParams });
  };
}
