/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from 'src/core/public/mocks';

/**
 * A set of default Kibana context values to use across component tests.
 * @see enterprise_search/public/index.tsx for the KibanaContext definition/import
 */
export const mockKibanaContext = {
  http: httpServiceMock.createSetupContract(),
  setBreadcrumbs: jest.fn(),
  enterpriseSearchUrl: 'http://localhost:3002',
};
