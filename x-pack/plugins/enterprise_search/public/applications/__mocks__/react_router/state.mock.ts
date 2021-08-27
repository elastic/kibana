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

export const mockHistory = {
  createHref: jest.fn(({ pathname }) => `/app/enterprise_search${pathname}`),
  push: jest.fn(),
  location: {
    pathname: '/current-path',
  },
  listen: jest.fn(() => jest.fn()),
} as any;

export const mockLocation = {
  key: 'someKey',
  pathname: '/current-path',
  search: '?query=something',
  hash: '#hash',
  state: {},
};
