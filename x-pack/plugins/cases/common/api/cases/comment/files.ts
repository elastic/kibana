/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const FileAttachmentMetadataRt = rt.type({
  files: rt.array(
    rt.type({
      name: rt.string,
      extension: rt.string,
      mimeType: rt.string,
      createdAt: rt.string,
    })
  ),
});

export type FileAttachmentMetadata = rt.TypeOf<typeof FileAttachmentMetadataRt>;

export const FILE_ATTACHMENT_TYPE = '.files';
