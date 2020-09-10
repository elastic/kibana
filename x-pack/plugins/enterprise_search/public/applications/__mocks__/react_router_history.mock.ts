/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
};
export const mockLocation = {
  key: 'someKey',
  pathname: '/current-path',
  search: '?query=something',
  hash: '#hash',
  state: {},
};

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(() => mockHistory),
  useLocation: jest.fn(() => mockLocation),
}));

/**
 * For example usage, @see public/applications/shared/react_router_helpers/eui_link.test.tsx
 */
