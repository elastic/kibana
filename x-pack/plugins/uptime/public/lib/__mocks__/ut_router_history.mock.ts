/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
export const mockHistory = {
  createHref: jest.fn(({ pathname }) => `/enterprise_search${pathname}`),
  push: jest.fn(),
  location: {
    pathname: '/current-path',
  },
};

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(() => mockHistory),
}));

/**
 * For example usage, @see public/applications/shared/react_router_helpers/eui_link.test.tsx
 */
