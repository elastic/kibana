/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../../../test_helpers/create_mock_server';
import { getConditionalHeaders, getCustomLogo } from './index';

let mockServer: any;
beforeEach(() => {
  mockServer = createMockServer('');
});

test(`gets logo from uiSettings`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {
      title: 'cool-job-bro',
      type: 'csv',
      jobParams: {
        savedObjectId: 'abc-123',
        isImmediate: false,
        savedObjectType: 'search',
      },
    },
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const { logo } = await getCustomLogo({
    job: {
      title: 'cool-job-bro',
      type: 'csv',
      jobParams: {
        savedObjectId: 'abc-123',
        isImmediate: false,
        savedObjectType: 'search',
      },
    },
    conditionalHeaders,
    server: mockServer,
  });

  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  expect(mockServer.uiSettingsServiceFactory().get).toBeCalledWith('xpackReporting:customPdfLogo');
});
