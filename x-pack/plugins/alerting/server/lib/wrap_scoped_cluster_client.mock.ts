/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

export const createWrappedScopedClusterClientMock = jest.fn().mockImplementation(() => {
  return {
    client: jest.fn().mockReturnValue(elasticsearchServiceMock.createScopedClusterClient()),
    getMetrics: jest.fn(),
  };
});
export const wrappedScopedClusterClientMock = {
  create: createWrappedScopedClusterClientMock,
};
