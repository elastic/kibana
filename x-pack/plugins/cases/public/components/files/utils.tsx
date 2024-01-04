/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExternalReferenceAttachmentPayload,
  FileAttachmentMetadata,
} from '../../../common/types/domain';
import { FileAttachmentMetadataRt } from '../../../common/types/domain';

import {
  compressionMimeTypes,
  IMAGE_MIME_TYPES,
  textMimeTypes,
  pdfMimeTypes,
} from '../../../common/constants/mime_types';
import * as i18n from './translations';

export const isImage = (file: { mimeType?: string }) => file.mimeType?.startsWith('image/');

export const parseMimeType = (mimeType: string | undefined) => {
  if (typeof mimeType === 'undefined') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return i18n.IMAGE_MIME_TYPE;
  }

  if (textMimeTypes.includes(mimeType)) {
    return i18n.TEXT_MIME_TYPE;
  }

  if (compressionMimeTypes.includes(mimeType)) {
    return i18n.COMPRESSED_MIME_TYPE;
  }

  if (pdfMimeTypes.includes(mimeType)) {
    return i18n.PDF_MIME_TYPE;
  }

  const result = mimeType.split('/');

  if (result.length <= 1 || result[0] === '') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  return result[0].charAt(0).toUpperCase() + result[0].slice(1);
};

export const isValidFileExternalReferenceMetadata = (
  externalReferenceMetadata: ExternalReferenceAttachmentPayload['externalReferenceMetadata']
): externalReferenceMetadata is FileAttachmentMetadata => {
  return (
    FileAttachmentMetadataRt.is(externalReferenceMetadata) &&
    externalReferenceMetadata?.files?.length >= 1
  );
};
