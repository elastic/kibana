/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagsClient } from '../../common/types';

const createClientMock = () => {
  const mock: jest.Mocked<ITagsClient> = {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  return mock;
};

export const tagsClientMock = {
  create: createClientMock,
};
