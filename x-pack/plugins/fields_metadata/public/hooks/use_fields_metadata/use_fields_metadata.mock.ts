/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseFieldsMetadataHook } from './use_fields_metadata';

export const createUseFieldsMetadataHookMock = (): jest.Mocked<UseFieldsMetadataHook> =>
  jest.fn(() => ({
    fieldsMetadata: undefined,
    loading: false,
    error: undefined,
    reload: jest.fn(),
  }));
