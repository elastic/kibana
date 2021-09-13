/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { setupEnvironment, kibanaDeprecationsServiceHelpers } from '../helpers';
import { KibanaTestBed, setupKibanaPage } from './kibana_deprecations.helpers';

describe('Error handling', () => {
  let testBed: KibanaTestBed;
  const { server } = setupEnvironment();
  const deprecationService = deprecationsServiceMock.createStartContract();

  afterAll(() => {
    server.restore();
  });

  test('handles plugin errors', async () => {
    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({
        deprecationService,
        response: [
          ...kibanaDeprecationsServiceHelpers.defaultMockedResponses.mockedKibanaDeprecations,
          {
            domainId: 'failed_plugin_id_1',
            title: 'Failed to fetch deprecations for "failed_plugin_id"',
            message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
            level: 'fetch_error',
            correctiveActions: {
              manualSteps: ['Check Kibana server logs for error message.'],
            },
          },
          {
            domainId: 'failed_plugin_id_1',
            title: 'Failed to fetch deprecations for "failed_plugin_id"',
            message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
            level: 'fetch_error',
            correctiveActions: {
              manualSteps: ['Check Kibana server logs for error message.'],
            },
          },
          {
            domainId: 'failed_plugin_id_2',
            title: 'Failed to fetch deprecations for "failed_plugin_id"',
            message: `Failed to get deprecations info for plugin "failed_plugin_id".`,
            level: 'fetch_error',
            correctiveActions: {
              manualSteps: ['Check Kibana server logs for error message.'],
            },
          },
        ],
      });

      testBed = await setupKibanaPage({
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    const { component, exists, find } = testBed;

    component.update();

    expect(exists('kibanaDeprecationErrors')).toBe(true);
    expect(find('kibanaDeprecationErrors').text()).toContain(
      'Failed to get deprecation issues for these plugins: failed_plugin_id_1, failed_plugin_id_2.'
    );
  });

  test('handles request error', async () => {
    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({
        deprecationService,
        mockRequestErrorMessage: 'Internal Server Error',
      });

      testBed = await setupKibanaPage({
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    const { component, exists, find } = testBed;

    component.update();

    expect(exists('kibanaRequestError')).toBe(true);
    expect(find('kibanaRequestError').text()).toContain(
      'Could not retrieve Kibana deprecation issues'
    );
  });
});
