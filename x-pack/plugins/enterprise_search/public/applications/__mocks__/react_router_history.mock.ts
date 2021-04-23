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

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useHistory: jest.fn(() => mockHistory),
    useLocation: jest.fn(() => mockLocation),
    useParams: jest.fn(() => ({})),
    useRouteMatch: jest.fn(() => null),
    // Note: RR's generatePath() opinionatedly encodeURI()s paths (although this doesn't actually
    // show up/affect the final browser URL). Since we already have a generateEncodedPath helper &
    // RR is removing this behavior in history 5.0+, I'm mocking tests to remove the extra encoding
    // for now to make reading generateEncodedPath URLs a little less of a pain
    generatePath: jest.fn((path, params) => decodeURI(originalModule.generatePath(path, params))),
  };
});

/**
 * For example usage, @see public/applications/shared/react_router_helpers/eui_link.test.tsx
 */
