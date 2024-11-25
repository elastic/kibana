/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { createFieldsMetadataClientMock } from './fields_metadata_client.mock';
import { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';

export const createFieldsMetadataServiceSetupMock =
  (): jest.Mocked<FieldsMetadataServiceSetup> => ({
    registerIntegrationFieldsExtractor: jest.fn(),
    registerIntegrationListExtractor: jest.fn(),
  });

export const createFieldsMetadataServiceStartMock =
  (): jest.Mocked<FieldsMetadataServiceStart> => ({
    getClient: jest.fn((_request: KibanaRequest) =>
      Promise.resolve(createFieldsMetadataClientMock())
    ),
  });
