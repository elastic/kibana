/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFieldsMetadataServiceStartMock } from './services/fields_metadata/fields_metadata_service.mock';
import { FieldsMetadataPublicStart } from './types';

const createFieldsMetadataPublicStartMock = (): jest.Mocked<FieldsMetadataPublicStart> => ({
  client: createFieldsMetadataServiceStartMock().client,
  useFieldsMetadata: jest.fn(),
});

export const fieldsMetadataPluginPublicMock = {
  createStartContract: createFieldsMetadataPublicStartMock,
};
