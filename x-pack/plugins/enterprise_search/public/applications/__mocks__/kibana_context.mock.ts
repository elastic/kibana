/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A set of default Kibana context values to use across component tests.
 * @see enterprise_search/public/index.tsx for the KibanaContext definition/import
 */
export const mockKibanaContext = {
  navigateToUrl: jest.fn(),
  setBreadcrumbs: jest.fn(),
  setDocTitle: jest.fn(),
  config: { host: 'http://localhost:3002' },
};
