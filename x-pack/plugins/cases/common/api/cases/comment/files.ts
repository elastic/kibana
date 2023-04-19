/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_DELETE_FILES } from '../../../constants';
import { limitedArraySchema, NonEmptyString } from '../../../schema';

export const SingleFileAttachmentMetadataRt = rt.type({
  name: rt.string,
  extension: rt.string,
  mimeType: rt.string,
  created: rt.string,
});

export const FileAttachmentMetadataRt = rt.type({
  files: rt.array(SingleFileAttachmentMetadataRt),
});

export type FileAttachmentMetadata = rt.TypeOf<typeof FileAttachmentMetadataRt>;

export const FILE_ATTACHMENT_TYPE = '.files';

const MIN_DELETE_IDS = 1;

export const BulkDeleteFileAttachmentsRequestRt = rt.type({
  ids: limitedArraySchema(NonEmptyString, MIN_DELETE_IDS, MAX_DELETE_FILES),
});

export type BulkDeleteFileAttachmentsRequest = rt.TypeOf<typeof BulkDeleteFileAttachmentsRequestRt>;
