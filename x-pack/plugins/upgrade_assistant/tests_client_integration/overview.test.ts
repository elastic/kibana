/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DomainDeprecationDetails } from 'kibana/public';
import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';
import { UpgradeAssistantStatus } from '../common/types';

import { OverviewTestBed, setupOverviewPage, setupEnvironment } from './helpers';

describe('Overview page', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    const esDeprecationsMockResponse: UpgradeAssistantStatus = {
      readyForUpgrade: false,
      cluster: [
        {
          level: 'critical',
          message: 'Index Lifecycle Management poll interval is set too low',
          url:
            'https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-8.0.html#ilm-poll-interval-limit',
          details:
            'The Index Lifecycle Management poll interval setting [indices.lifecycle.poll_interval] is currently set to [500ms], but must be 1s or greater',
        },
      ],
      indices: [
        {
          level: 'warning',
          message: 'translog retention settings are ignored',
          url:
            'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-translog.html',
          details:
            'translog retention settings [index.translog.retention.size] and [index.translog.retention.age] are ignored because translog is no longer used in peer recoveries with soft-deletes enabled (default in 7.0 or later)',
          index: 'settings',
          reindex: false,
        },
      ],
    };

    const kibanaDeprecationsMockResponse: DomainDeprecationDetails[] = [
      {
        correctiveActions: {},
        domainId: 'xpack.spaces',
        level: 'critical',
        message:
          'Disabling the spaces plugin (xpack.spaces.enabled) will not be supported in the next major version (8.0)',
      },
    ];

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({ isEnabled: true });

    await act(async () => {
      const deprecationService = deprecationsServiceMock.createStartContract();
      deprecationService.getAllDeprecations = jest
        .fn()
        .mockReturnValue(kibanaDeprecationsMockResponse);

      testBed = await setupOverviewPage({
        deprecations: deprecationService,
      });
    });

    const { component } = testBed;
    component.update();
  });

  afterAll(() => {
    server.restore();
  });

  test('renders the overview page', () => {
    const { exists, find } = testBed;

    expect(exists('overviewPageContent')).toBe(true);

    // Verify ES stats
    expect(exists('esStatsPanel')).toBe(true);
    expect(find('esStatsPanel.totalDeprecations').text()).toContain('2');
    expect(find('esStatsPanel.criticalDeprecations').text()).toContain('1');

    // Verify Kibana stats
    expect(exists('kibanaStatsPanel')).toBe(true);
    expect(find('kibanaStatsPanel.totalDeprecations').text()).toContain('1');
    expect(find('kibanaStatsPanel.criticalDeprecations').text()).toContain('1');
  });

  describe('Deprecation logging', () => {
    test('toggles deprecation logging', async () => {
      const { find, actions } = testBed;

      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse({ isEnabled: false });

      expect(find('upgradeAssistantDeprecationToggle').text()).toEqual(
        'Disable deprecation logging'
      );

      await actions.clickDeprecationToggle();

      const latestRequest = server.requests[server.requests.length - 1];
      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual({ isEnabled: false });
      expect(find('upgradeAssistantDeprecationToggle').text()).toEqual(
        'Enable deprecation logging'
      );
    });

    test('handles network error when updating logging state', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      const { actions, find, exists } = testBed;

      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(undefined, error);

      expect(find('upgradeAssistantDeprecationToggle').text()).toEqual(
        'Disable deprecation logging'
      );

      await actions.clickDeprecationToggle();

      // Logging state should not change since there was an error
      expect(find('upgradeAssistantDeprecationToggle').text()).toEqual(
        'Disable deprecation logging'
      );
      expect(exists('updateLoggingError')).toBe(true);
    });

    test('handles network error when fetching logging state', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadDeprecationLoggingResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage();
      });

      const { component, exists, find } = testBed;

      component.update();

      expect(find('upgradeAssistantDeprecationToggle').text()).toEqual(
        'Deprecation logging unavailable'
      );
      expect(exists('fetchLoggingError')).toBe(true);
    });
  });

  describe('Error handling', () => {
    describe('Kibana deprecations', () => {
      test('handles network failure', async () => {
        await act(async () => {
          const deprecationService = deprecationsServiceMock.createStartContract();
          deprecationService.getAllDeprecations = jest
            .fn()
            .mockRejectedValue(new Error('Internal Server Error'));

          testBed = await setupOverviewPage({
            deprecations: deprecationService,
          });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('requestErrorIconTip')).toBe(true);
      });
    });

    describe('Elasticsearch deprecations', () => {
      test('handles network failure', async () => {
        const error = {
          statusCode: 500,
          error: 'Internal server error',
          message: 'Internal server error',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('requestErrorIconTip')).toBe(true);
      });

      test('handles unauthorized error', async () => {
        const error = {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('unauthorizedErrorIconTip')).toBe(true);
      });

      test('handles partially upgraded error', async () => {
        const error = {
          statusCode: 426,
          error: 'Upgrade required',
          message: 'There are some nodes running a different version of Elasticsearch',
          attributes: {
            allNodesUpgraded: false,
          },
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('partiallyUpgradedErrorIconTip')).toBe(true);
      });

      test('handles upgrade error', async () => {
        const error = {
          statusCode: 426,
          error: 'Upgrade required',
          message: 'There are some nodes running a different version of Elasticsearch',
          attributes: {
            allNodesUpgraded: true,
          },
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('upgradedErrorIconTip')).toBe(true);
      });
    });
  });
});
