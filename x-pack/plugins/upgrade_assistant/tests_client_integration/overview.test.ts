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

  beforeEach(async () => {
    await act(async () => {
      testBed = await setupOverviewPage();
    });
  });

  describe('Coming soon prompt', () => {
    // Default behavior up until the last minor before the next major release
    test('renders the coming soon prompt by default', () => {
      const { exists } = testBed;

      expect(exists('comingSoonPrompt')).toBe(true);
    });
  });

  describe('Overview content', () => {
    const { server, httpRequestsMockHelpers } = setupEnvironment();

    const upgradeStatusMockResponse = {
      readyForUpgrade: false,
      cluster: [],
      indices: [],
    };

    httpRequestsMockHelpers.setLoadStatusResponse(upgradeStatusMockResponse);
    httpRequestsMockHelpers.setLoadDeprecationLoggingResponse({ isEnabled: true });

    beforeEach(async () => {
      await act(async () => {
        // Override the default context value to verify tab content renders as expected
        // This will be the default behavior on the last minor before the next major release (e.g., v7.15)
        testBed = await setupOverviewPage({ isReadOnlyMode: false });
      });

      testBed.component.update();
    });

    afterAll(() => {
      server.restore();
    });

    test('renders the overview tab', () => {
      const { exists } = testBed;

      expect(exists('comingSoonPrompt')).toBe(false);
      expect(exists('upgradeAssistantPageContent')).toBe(true);
    });

    describe('Deprecation logging', () => {
      test('toggles deprecation logging', async () => {
        const { form, find, component } = testBed;

        httpRequestsMockHelpers.setUpdateDeprecationLoggingResponse({ isEnabled: false });

        expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(true);
        expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(false);
        expect(find('deprecationLoggingStep').find('.euiSwitch__label').text()).toContain('On');

        await act(async () => {
          form.toggleEuiSwitch('upgradeAssistantDeprecationToggle');
        });

        component.update();

        expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(false);
        expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(false);
        expect(find('deprecationLoggingStep').find('.euiSwitch__label').text()).toContain('Off');
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
        expect(find('deprecationLoggingStep').find('.euiSwitch__label').text()).toContain('On');

        await act(async () => {
          form.toggleEuiSwitch('upgradeAssistantDeprecationToggle');
        });

        component.update();

        expect(find('upgradeAssistantDeprecationToggle').props()['aria-checked']).toBe(true);
        expect(find('upgradeAssistantDeprecationToggle').props().disabled).toBe(true);
        expect(find('deprecationLoggingStep').find('.euiSwitch__label').text()).toContain(
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
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists, find } = testBed;

        component.update();

        expect(exists('upgradeStatusError')).toBe(true);
        expect(find('upgradeStatusError').text()).toContain(
          'An error occurred while retrieving the checkup results.'
        );
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

        const { component, exists, find } = testBed;

        component.update();

        expect(exists('partiallyUpgradedPrompt')).toBe(true);
        expect(find('partiallyUpgradedPrompt').text()).toContain('Your cluster is upgrading');
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

        const { component, exists, find } = testBed;

        component.update();

        expect(exists('upgradedPrompt')).toBe(true);
        expect(find('upgradedPrompt').text()).toContain('Your cluster has been upgraded');
      });
    });
  });
});
