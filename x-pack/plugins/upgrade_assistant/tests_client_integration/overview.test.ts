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
      const { form, find, component } = testBed;

      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse({ isEnabled: false });

      expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(true);
      expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(false);

      await act(async () => {
        form.toggleEuiSwitch('upgradeAssistantDeprecationToggle');
      });

      component.update();

      expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(false);
      expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(false);
    });

    test('handles network error', async () => {
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      const { form, find, component } = testBed;

      httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse(undefined, error);

      expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(true);
      expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(false);
      expect(find('deprecationLoggingFormRow').find('.euiSwitch__label').text()).toContain(
        'Enable deprecation logging'
      );

      await act(async () => {
        form.toggleEuiSwitch('upgradeAssistantDeprecationToggle');
      });

      component.update();

      expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(true);
      expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(true);
      expect(find('deprecationLoggingFormRow').find('.euiSwitch__label').text()).toContain(
        'Could not load logging state'
      );
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
