/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagInternalClient } from './tags_client';

const createInternalClientMock = () => {
  const mock: jest.Mocked<ITagInternalClient> = {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    bulkDelete: jest.fn(),
  };

  return mock;
};

export const tagClientMock = {
  create: createInternalClientMock,
};
