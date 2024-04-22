/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';

export const createWrappedSearchSourceClientMock = jest.fn().mockImplementation(() => {
  return {
    client: jest.fn().mockReturnValue(searchSourceCommonMock),
    getMetrics: jest.fn(),
  };
});
export const wrappedSearchSourceClientMock = {
  create: createWrappedSearchSourceClientMock,
};
