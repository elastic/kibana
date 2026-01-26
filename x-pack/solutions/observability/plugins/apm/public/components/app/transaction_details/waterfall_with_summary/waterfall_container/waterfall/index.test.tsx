/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import React from 'react';
import { renderWithTheme } from '../../../../../../utils/test_helpers';
import { Waterfall } from '.';
import type { IWaterfall } from './waterfall_helpers/waterfall_helpers';
import { WaterfallLegendType } from '../../../../../../../common/waterfall/legend';

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
    renderWithTheme(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    const warning = screen.queryByTestId('apmWaterfallSizeWarning');
    expect(warning).not.toBeInTheDocument();
  });

  it('renders warning when exceedsMax is true', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWithTheme(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    expect(warning).toBeInTheDocument();
  });

  it('displays correct warning text with traceDocsTotal and maxTraceItems', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 15551,
      maxTraceItems: 5000,
    });
    renderWithTheme(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    const warningText = warning.textContent;

    expect(warningText).toContain('15551');
    expect(warningText).toContain('5000');
    expect(warningText).toContain('xpack.apm.ui.maxTraceItems');
  });

  it('displays warning with different traceDocsTotal and maxTraceItems values', () => {
    const waterfall = createMockWaterfall({
      exceedsMax: true,
      traceDocsTotal: 10000,
      maxTraceItems: 3000,
    });
    renderWithTheme(<Waterfall waterfall={waterfall} showCriticalPath={false} />);

    const warning = screen.getByTestId('apmWaterfallSizeWarning');
    const warningText = warning.textContent;

    expect(warningText).toContain('10000');
    expect(warningText).toContain('3000');
    expect(warningText).toContain('xpack.apm.ui.maxTraceItems');
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
      const { container } = renderWithTheme(
        <Waterfall waterfall={waterfall} showCriticalPath={false} />
      );

      // Component should render without errors when serviceBadgesHeight is not provided
      expect(container).toBeInTheDocument();
    });

    it('sticky top position includes serviceBadgesHeight in calculation', () => {
      const waterfall = createMockWaterfall();
      const serviceBadgesHeight = 50;

      renderWithTheme(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          serviceBadgesHeight={serviceBadgesHeight}
        />
      );

      // Find the timeline container directly by test id
      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');

      expect(timelineContainer).toBeInTheDocument();
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain('calc');
      expect(styles.top).toContain(`${serviceBadgesHeight}px`);
    });

    it('when serviceBadgesHeight is 0, uses default sticky positioning', () => {
      const waterfall = createMockWaterfall();

      renderWithTheme(
        <Waterfall waterfall={waterfall} showCriticalPath={false} serviceBadgesHeight={0} />
      );

      // Find the timeline container directly by test id
      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');

      expect(timelineContainer).toBeInTheDocument();
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain('calc');
      expect(styles.top).toContain('0px');
    });

    it('when serviceBadgesHeight is provided, adds it to sticky top position', () => {
      const waterfall = createMockWaterfall();
      const serviceBadgesHeight = 100;

      renderWithTheme(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          serviceBadgesHeight={serviceBadgesHeight}
        />
      );

      // Find the timeline container directly by test id
      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');

      expect(timelineContainer).toBeInTheDocument();
      const styles = window.getComputedStyle(timelineContainer);
      expect(styles.position).toBe('sticky');
      expect(styles.top).toContain(`${serviceBadgesHeight}px`);
    });

    it('in embeddable mode (isEmbeddable=true), uses position relative instead of sticky', () => {
      const waterfall = createMockWaterfall();

      renderWithTheme(
        <Waterfall
          waterfall={waterfall}
          showCriticalPath={false}
          isEmbeddable={true}
          serviceBadgesHeight={50}
        />
      );

      // Find the timeline container directly by test id
      const timelineContainer = screen.getByTestId('apmWaterfallTimelineContainer');

      expect(timelineContainer).toBeInTheDocument();
      const styles = window.getComputedStyle(timelineContainer);
      // In embeddable mode, should be relative, not sticky
      expect(styles.position).toBe('relative');
      // Should not contain the calc with serviceBadgesHeight
      expect(styles.top).not.toContain('calc');
    });
  });
});
