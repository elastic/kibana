/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import {
  FileAttachmentMetadataRt,
  FILE_ATTACHMENT_TYPE,
  throwErrors,
  excess,
} from '../../common/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry
) => {
  externalRefRegistry.register({ id: FILE_ATTACHMENT_TYPE, schemaValidator });
};

const schemaValidator = (data: unknown): void => {
  const fileMetadata = pipe(
    excess(FileAttachmentMetadataRt.type).decode(data),
    fold(throwErrors(badRequest), identity)
  );

  if (fileMetadata.files.length > 1) {
    throw badRequest('Only a single file can be stored in an attachment');
  }
};
