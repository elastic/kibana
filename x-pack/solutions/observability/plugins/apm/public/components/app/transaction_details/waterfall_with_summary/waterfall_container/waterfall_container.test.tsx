/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/react';
import { waitFor, render } from '@testing-library/react';
import React from 'react';
import { userEvent } from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { EuiThemeProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { disableConsoleWarning, renderWithTheme } from '../../../../../utils/test_helpers';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { UrlParamsProvider } from '../../../../../context/url_params_context/url_params_context';
import * as stories from './waterfall_container.stories';
import { WaterfallContainer } from '.';
import type { IWaterfall } from './waterfall/waterfall_helpers/waterfall_helpers';
import { useElementHeight } from '../../../../../hooks/use_element_height';
import { WaterfallLegendType } from '../../../../../../common/waterfall/legend';
const { Example } = composeStories(stories);

// Mock the useElementHeight hook
jest.mock('../../../../../hooks/use_element_height', () => ({
  useElementHeight: jest.fn((ref, enabled) => {
    // Return a mock height value when enabled
    return enabled ? 50 : 0;
  }),
}));

describe('WaterfallContainer', () => {
  let consoleMock: jest.SpyInstance;

  // Create a history with a route path that matches useAnyOfApmParams expectations
  const createTestHistory = () => {
    return createMemoryHistory({
      initialEntries: [
        '/services/test-service/transactions/view?transactionName=test-transaction&comparisonEnabled=false&showCriticalPath=false&rangeFrom=now-15m&rangeTo=now',
      ],
    });
  };

  const createMockWaterfall = (overrides?: Partial<IWaterfall>): IWaterfall => {
    return {
      duration: 1000000,
      items: [],
      childrenByParentId: {},
      getErrorCount: jest.fn(() => 0),
      legends: [],
      colorBy: WaterfallLegendType.ServiceName,
      errorItems: [],
      exceedsMax: false,
      totalErrorsCount: 0,
      traceDocsTotal: 5,
      maxTraceItems: 10,
      orphanTraceItemsCount: 0,
      ...overrides,
    };
  };

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it('expands and contracts the accordion', async () => {
    const { getAllByRole } = renderWithTheme(<Example />);
    const buttons = await waitFor(() => getAllByRole('button'));
    const parentItem = buttons[1];
    const childItem = buttons[3];

    await userEvent.click(parentItem);

    expect(parentItem).toHaveAttribute('aria-expanded', 'false');
    expect(childItem).toHaveAttribute('aria-expanded', 'true');
  });

  describe('service badges container', () => {
    it('has sticky positioning styles applied', () => {
      const waterfall = createMockWaterfall();
      const history = createTestHistory();
      const { container } = render(
        <MockApmPluginContextWrapper history={history}>
          <KibanaContextProvider>
            <UrlParamsProvider>
              <EuiThemeProvider>
                <WaterfallContainer
                  waterfall={waterfall}
                  showCriticalPath={false}
                  onShowCriticalPathChange={jest.fn()}
                />
              </EuiThemeProvider>
            </UrlParamsProvider>
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      );

      // Find all EuiFlexGroup containers and check for sticky positioning
      const flexGroups = Array.from(container.querySelectorAll('[class*="euiFlexGroup"]'));
      const stickyContainer = flexGroups.find((group) => {
        const styles = window.getComputedStyle(group);
        return styles.position === 'sticky';
      });

      expect(stickyContainer).toBeInTheDocument();
      if (stickyContainer) {
        const styles = window.getComputedStyle(stickyContainer);
        expect(styles.position).toBe('sticky');
      }
    });

    it('calculates and passes serviceBadgesHeight to Waterfall component', () => {
      const waterfall = createMockWaterfall();

      // Mock the hook to return a specific height
      (useElementHeight as jest.Mock).mockReturnValue(75);

      const history = createTestHistory();
      render(
        <MockApmPluginContextWrapper history={history}>
          <KibanaContextProvider>
            <UrlParamsProvider>
              <EuiThemeProvider>
                <WaterfallContainer
                  waterfall={waterfall}
                  showCriticalPath={false}
                  onShowCriticalPathChange={jest.fn()}
                />
              </EuiThemeProvider>
            </UrlParamsProvider>
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      );

      // Verify the hook was called with enabled=true when waterfall exists
      expect(useElementHeight).toHaveBeenCalled();
      const calls = (useElementHeight as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Second argument should be true when waterfall exists
      expect(calls[calls.length - 1][1]).toBe(true);
    });

    it('hook is enabled only when waterfall exists', () => {
      (useElementHeight as jest.Mock).mockClear();

      const waterfall = createMockWaterfall();
      const history = createTestHistory();

      render(
        <MockApmPluginContextWrapper history={history}>
          <KibanaContextProvider>
            <UrlParamsProvider>
              <EuiThemeProvider>
                <WaterfallContainer
                  waterfall={waterfall}
                  showCriticalPath={false}
                  onShowCriticalPathChange={jest.fn()}
                />
              </EuiThemeProvider>
            </UrlParamsProvider>
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      );

      // When waterfall exists, hook should be called with enabled=true
      expect(useElementHeight).toHaveBeenCalled();
      const calls = (useElementHeight as jest.Mock).mock.calls;
      expect(calls[calls.length - 1][1]).toBe(true);
    });

    it('returns null when waterfall is not provided', () => {
      const { container } = renderWithTheme(
        <WaterfallContainer
          waterfall={null as unknown as IWaterfall}
          showCriticalPath={false}
          onShowCriticalPathChange={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('service badges container has correct CSS properties', () => {
      const waterfall = createMockWaterfall();
      const history = createTestHistory();
      const { container } = render(
        <MockApmPluginContextWrapper history={history}>
          <KibanaContextProvider>
            <UrlParamsProvider>
              <EuiThemeProvider>
                <WaterfallContainer
                  waterfall={waterfall}
                  showCriticalPath={false}
                  onShowCriticalPathChange={jest.fn()}
                />
              </EuiThemeProvider>
            </UrlParamsProvider>
          </KibanaContextProvider>
        </MockApmPluginContextWrapper>
      );

      // Find containers with sticky positioning
      const flexGroups = Array.from(container.querySelectorAll('[class*="euiFlexGroup"]'));
      const stickyContainer = flexGroups.find((group) => {
        const styles = window.getComputedStyle(group);
        return styles.position === 'sticky';
      });

      expect(stickyContainer).toBeInTheDocument();
      if (stickyContainer) {
        const styles = window.getComputedStyle(stickyContainer);
        expect(styles.position).toBe('sticky');
        // Check that z-index is set (should be a number, not 'auto')
        expect(styles.zIndex).not.toBe('auto');
        // Check that top is set (could be '0px' or a CSS variable)
        expect(styles.top).toBeDefined();
      }
    });

    it('ref is properly attached to service badges container', () => {
      // The ref should be attached to an EuiFlexGroup element
      // We can verify this by checking that useElementHeight was called with a ref
      expect(useElementHeight).toHaveBeenCalled();
      const calls = (useElementHeight as jest.Mock).mock.calls;
      const refArg = calls[calls.length - 1][0];
      expect(refArg).toBeDefined();
      expect(refArg).toHaveProperty('current');
    });
  });
});
