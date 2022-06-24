/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IClusterClientAdapter } from './cluster_client_adapter';

const createClusterClientMock = () => {
  const mock: jest.Mocked<IClusterClientAdapter> = {
    indexDocument: jest.fn(),
    indexDocuments: jest.fn(),
    doesIlmPolicyExist: jest.fn(),
    createIlmPolicy: jest.fn(),
    doesIndexTemplateExist: jest.fn(),
    createIndexTemplate: jest.fn(),
    doesAliasExist: jest.fn(),
    createIndex: jest.fn(),
    getExistingLegacyIndexTemplates: jest.fn(),
    setLegacyIndexTemplateToHidden: jest.fn(),
    getExistingIndices: jest.fn(),
    setIndexToHidden: jest.fn(),
    getExistingIndexAliases: jest.fn(),
    setIndexAliasToHidden: jest.fn(),
    queryEventsBySavedObjects: jest.fn(),
    aggregateEventsBySavedObjects: jest.fn(),
    shutdown: jest.fn(),
  };
  return mock;
};

export const clusterClientAdapterMock = {
  create: createClusterClientMock,
};
