/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON } from '@kbn/shared-ux-file-types';

import type { CommentRequestExternalReferenceType } from '../../../common/api';

import { FileAttachmentMetadataRt } from '../../../common/api';
import * as i18n from './translations';

export const isImage = (file: FileJSON) => file.mimeType?.startsWith('image/');

export const parseMimeType = (mimeType: string | undefined) => {
  if (typeof mimeType === 'undefined') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  const result = mimeType.split('/');

  if (result.length <= 1 || result[0] === '') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  return result[0].charAt(0).toUpperCase() + result[0].slice(1);
};

export const isValidFileExternalReferenceMetadata = (
  externalReferenceMetadata: CommentRequestExternalReferenceType['externalReferenceMetadata']
): boolean => {
  return (
    FileAttachmentMetadataRt.is(externalReferenceMetadata) &&
    externalReferenceMetadata?.files?.length >= 1
  );
};
