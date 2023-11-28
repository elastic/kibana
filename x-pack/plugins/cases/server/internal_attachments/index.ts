/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { FileAttachmentMetadataRt } from '../../common/types/domain';
import { LENS_ATTACHMENT_TYPE } from '../../common/constants/visualizations';
import { FILE_ATTACHMENT_TYPE } from '../../common/constants';

import { decodeWithExcessOrThrow } from '../../common/api';
import type { ExternalReferenceAttachmentTypeRegistry } from '../attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../attachment_framework/persistable_state_registry';

export const registerInternalAttachments = (
  externalRefRegistry: ExternalReferenceAttachmentTypeRegistry,
  persistableStateRegistry: PersistableStateAttachmentTypeRegistry
) => {
  externalRefRegistry.register({ id: FILE_ATTACHMENT_TYPE, schemaValidator });
  persistableStateRegistry.register({ id: LENS_ATTACHMENT_TYPE });
};

const schemaValidator = (data: unknown): void => {
  const fileMetadata = decodeWithExcessOrThrow(FileAttachmentMetadataRt)(data);

  if (fileMetadata.files.length > 1) {
    throw badRequest('Only a single file can be stored in an attachment');
  }
};
