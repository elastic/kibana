/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from '@kbn/core/public/mocks';

import { APP_LOGS_COUNT_CLUSTER_PRIVILEGES } from '../../../../common/constants';
import { setupEnvironment } from '../../helpers';
import { kibanaDeprecationsServiceHelpers } from '../service.mock';
import { KibanaTestBed, setupKibanaPage } from '../kibana_deprecations.helpers';

describe('Kibana deprecations - Deprecations table - Error handling', () => {
  let testBed: KibanaTestBed;
  const deprecationService = deprecationsServiceMock.createStartContract();

  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpSetup = mockEnvironment.httpSetup;
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

      testBed = await setupKibanaPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
        privileges: {
          hasAllPrivileges: true,
          missingPrivileges: {
            cluster: [...APP_LOGS_COUNT_CLUSTER_PRIVILEGES],
            index: [],
          },
        },
      });
    });

    const { component, exists, find } = testBed;

    component.update();

    expect(exists('kibanaDeprecationErrors')).toBe(true);
    // Should contain error about failed deprecations
    expect(find('kibanaDeprecationErrors').text()).toContain(
      'Failed to get deprecation issues for these plugins: failed_plugin_id_1, failed_plugin_id_2.'
    );
    // Should contain error about missing privilege
    expect(find('kibanaDeprecationErrors').text()).toContain(
      'Certain issues might be missing due to missing cluster privilege for: manage_security'
    );
  });

  test('handles request error', async () => {
    await act(async () => {
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({
        deprecationService,
        mockRequestErrorMessage: 'Internal Server Error',
      });

      testBed = await setupKibanaPage(httpSetup, {
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    const { component, find } = testBed;
    component.update();
    expect(find('deprecationsPageLoadingError').text()).toContain(
      'Could not retrieve Kibana deprecation issues'
    );
  });
});
