/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockEventViewerResponse = {
  totalCount: 12,
  pageInfo: {
    activePage: 0,
    fakeTotalCount: 100,
  },
  events: [],
  inspect: {
    dsl: [],
    response: [],
  },
  loadPage: jest.fn(),
  refetch: jest.fn(),
};
