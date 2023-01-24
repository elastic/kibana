/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO(jbudz): should be removed when upgrading to TS@4.8
// this is a skip for the errors created when typechecking with isolatedModules
export {};

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: () => unknown) => fn,
}));

jest.mock('../../../crud_app/services/documentation_links', () => {
  const coreMocks = jest.requireActual('@kbn/core/public/mocks');

  return {
    init: jest.fn(),
    documentationLinks: coreMocks.docLinksServiceMock.createStartContract().links,
  };
});
