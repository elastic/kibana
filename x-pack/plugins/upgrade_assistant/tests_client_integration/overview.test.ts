/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { OverviewTestBed, setupOverviewPage, setupEnvironment } from './helpers';

describe('Overview page', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    const upgradeStatusMockResponse = {
      readyForUpgrade: false,
      cluster: [],
      indices: [],
    };

    httpRequestsMockHelpers.setLoadStatusResponse(upgradeStatusMockResponse);
    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({ isEnabled: true });

    await act(async () => {
      testBed = await setupOverviewPage();
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
    expect(find('esStatsPanel.totalDeprecations').text()).toContain('0');
    expect(find('esStatsPanel.criticalDeprecations').text()).toContain('0');
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
    test('handles network failure', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

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

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

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

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

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

      httpRequestsMockHelpers.setLoadStatusResponse(undefined, error);

      await act(async () => {
        testBed = await setupOverviewPage({ isReadOnlyMode: false });
      });

      const { component, exists } = testBed;

      component.update();

      expect(exists('upgradedErrorIconTip')).toBe(true);
    });
  });
});
