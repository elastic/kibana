/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createFieldsMetadataServiceSetupMock,
  createFieldsMetadataServiceStartMock,
} from './services/fields_metadata/fields_metadata_service.mock';
import { FieldsMetadataServerSetup, FieldsMetadataServerStart } from './types';

const createFieldsMetadataSetupMock = () => {
  const fieldsMetadataSetupMock: jest.Mocked<FieldsMetadataServerSetup> = {
    fieldsMetadata: createFieldsMetadataServiceSetupMock(),
  };

  return fieldsMetadataSetupMock;
};

const createFieldsMetadataStartMock = () => {
  const fieldsMetadataStartMock: jest.Mocked<FieldsMetadataServerStart> = {
    fieldsMetadata: createFieldsMetadataServiceStartMock(),
  };
  return fieldsMetadataStartMock;
};

export const fieldsMetadataPluginMock = {
  createSetupContract: createFieldsMetadataSetupMock,
  createStartContract: createFieldsMetadataStartMock,
};
