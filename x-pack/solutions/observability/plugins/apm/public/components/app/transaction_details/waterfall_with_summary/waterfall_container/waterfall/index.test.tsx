/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { Waterfall } from '.';
import type { IWaterfall } from './waterfall_helpers/waterfall_helpers';
import { WaterfallLegendType } from '../../../../../../../common/waterfall/legend';

const renderWaterfall = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>{ui}</EuiThemeProvider>
    </I18nProvider>
  );

jest.mock('../../../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: { rangeFrom: 'now-15m', rangeTo: 'now' },
  }),
}));

jest.mock('../../../../../shared/links/discover_links/use_discover_href', () => ({
  useDiscoverHref: () => 'https://discover-link',
}));

describe('Waterfall', () => {
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

  it('does not render warning when exceedsMax is false', () => {
    const waterfall = createMockWaterfall({ exceedsMax: false });
    renderWaterfall(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    expect(screen.queryByTestId('apmWaterfallSizeWarning')).not.toBeInTheDocument();
  });

  it('renders warning when exceedsMax is true', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWaterfall(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    expect(screen.getByTestId('apmWaterfallSizeWarning')).toBeInTheDocument();
  });

  it('passes discoverHref to the warning callout', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWaterfall(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    const link = screen.getByTestId('apmWaterfallSizeWarningDiscoverLink');
    expect(link).toHaveAttribute('href', 'https://discover-link');
  });

  describe('serviceBadgesHeight prop', () => {
    // Mock getComputedStyle to return expected values since JSDOM doesn't compute Emotion styles
    const originalGetComputedStyle = window.getComputedStyle;
    let mockGetComputedStyle: jest.SpyInstance;

    beforeEach(() => {
      mockGetComputedStyle = jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const computed = originalGetComputedStyle(el);
        const testId = el.getAttribute('data-test-subj');

        // Only mock for the timeline container element
        if (testId === 'apmWaterfallTimelineContainer') {
          const isEmbeddable = el.getAttribute('data-is-embeddable') === 'true';
          const serviceBadgesHeight = parseInt(
            el.getAttribute('data-service-badges-height') || '0',
            10
          );

          const mockStyle = {
            ...computed,
            position: isEmbeddable ? 'relative' : 'sticky',
            top: isEmbeddable
              ? ''
              : `calc(var(--euiFixedHeadersOffset, 0) + ${serviceBadgesHeight}px)`,
          } as CSSStyleDeclaration;
          return mockStyle;
        }

        return computed;
      });
    });

    afterEach(() => {
      mockGetComputedStyle.mockRestore();
    });

    it('accepts serviceBadgesHeight prop with default value of 0', () => {
      const waterfall = createMockWaterfall();
      const { container } = renderWaterfall(
        <Waterfall waterfall={waterfall} showCriticalPath={false} />
      );

      expect(container).toBeInTheDocument();
    });

    it('sticky top position includes serviceBadgesHeight in calculation', () => {
      const waterfall = createMockWaterfall();
      const serviceBadgesHeight = 50;

      renderWaterfall(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          serviceBadgesHeight={serviceBadgesHeight}
        />
      );

      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain('calc');
      expect(styles.top).toContain(`${serviceBadgesHeight}px`);
    });

    it('when serviceBadgesHeight is 0, uses default sticky positioning', () => {
      const waterfall = createMockWaterfall();

      renderWaterfall(
        <Waterfall waterfall={waterfall} showCriticalPath={false} serviceBadgesHeight={0} />
      );

      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain('calc');
      expect(styles.top).toContain('0px');
    });

    it('when serviceBadgesHeight is provided, adds it to sticky top position', () => {
      const waterfall = createMockWaterfall();
      const serviceBadgesHeight = 100;

      renderWaterfall(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          serviceBadgesHeight={serviceBadgesHeight}
        />
      );

      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain(`${serviceBadgesHeight}px`);
    });

    it('in embeddable mode (isEmbeddable=true), uses position relative instead of sticky', () => {
      const waterfall = createMockWaterfall();

      renderWaterfall(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          isEmbeddable={true}
          serviceBadgesHeight={50}
        />
      );

      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('relative');
      expect(styles.top).not.toContain('calc');
    });
  });
});
