/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_DELETE_FILES } from '../../../constants';
import { limitedArraySchema, NonEmptyString } from '../../../schema';

export const SingleFileAttachmentMetadataRt = rt.strict({
  name: rt.string,
  extension: rt.string,
  mimeType: rt.string,
  created: rt.string,
});

export const FileAttachmentMetadataRt = rt.strict({
  files: rt.array(SingleFileAttachmentMetadataRt),
});

export type FileAttachmentMetadata = rt.TypeOf<typeof FileAttachmentMetadataRt>;

const MIN_DELETE_IDS = 1;

export const BulkDeleteFileAttachmentsRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_DELETE_FILES,
    fieldName: 'ids',
  }),
});

export type BulkDeleteFileAttachmentsRequest = rt.TypeOf<typeof BulkDeleteFileAttachmentsRequestRt>;
