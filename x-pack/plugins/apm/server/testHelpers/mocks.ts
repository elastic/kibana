/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../lib/helpers/setup_request';

interface TestSetup extends Setup {
  client: jest.Mock;
  config: {
    get: jest.Mock;
    has: () => boolean;
  };
}

export function getSetupMock(overrides: Partial<TestSetup> = {}) {
  return {
    client: jest.fn(),
    start: 100,
    end: 200,
    config: {
      get: jest.fn(),
      has: () => true
    },
    uiFiltersES: [
      {
        term: { field: 'test.esfilter.query' }
      }
    ],
    ...overrides
  };
}
