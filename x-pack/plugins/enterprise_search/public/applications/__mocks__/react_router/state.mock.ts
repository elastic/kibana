/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * NOTE: These variable names MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */

export const mockLocation = {
  key: 'someKey',
  pathname: '/current-path',
  search: '?query=something',
  hash: '#hash',
  state: {},
};

export const mockHistory = {
  createHref: jest.fn(({ pathname }) => `/app/enterprise_search${pathname}`),
  push: jest.fn(),
  location: mockLocation,
  listen: jest.fn(() => jest.fn()),
  basePath: '/app/enterprise_search',
} as any;
