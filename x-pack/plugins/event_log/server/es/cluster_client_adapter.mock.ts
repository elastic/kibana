/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    queryEventsBySavedObjects: jest.fn(),
    shutdown: jest.fn(),
  };
  return mock;
};

export const clusterClientAdapterMock = {
  create: createClusterClientMock,
};
