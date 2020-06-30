/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TagsClient } from './tags';
import { TagAttachmentsClient } from './tag_attachments';

export interface TagsRequestHandlerContext {
  tagsClient: TagsClient;
  attachmentsClient: TagAttachmentsClient;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    tags?: TagsRequestHandlerContext;
  }
}
