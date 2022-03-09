/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: () => unknown) => fn,
}));

jest.mock('../../../crud_app/services/documentation_links', () => {
  const coreMocks = jest.requireActual('../../../../../../../src/core/public/mocks');

  return {
    init: jest.fn(),
    documentationLinks: coreMocks.docLinksServiceMock.createStartContract().links,
  };
});
