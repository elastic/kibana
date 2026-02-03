/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import type { EuiAccordionProps } from '@elastic/eui';
import { convertTreeToList, TraceWaterfall } from '.';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

// Mock AutoSizer to avoid ResizeObserver issues in jsdom
jest.mock('react-virtualized', () => {
  const actual = jest.requireActual('react-virtualized');

  return {
    ...actual,
    AutoSizer: ({ children }: { children: (size: { width: number; height: number }) => any }) =>
      children({ width: 800, height: 600 }),
  };
});

describe('convertTreeToList', () => {
  const itemA: TraceWaterfallItem = {
    id: 'a',
    parentId: undefined,
    name: 'A',
    timestampUs: 0,
    traceId: 't1',
    duration: 100,
    serviceName: 'svcA',
    depth: 0,
    offset: 0,
    skew: 0,
    color: 'red',
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
  };
  const itemB: TraceWaterfallItem = {
    id: 'b',
    parentId: 'a',
    name: 'B',
    timestampUs: 0,
    traceId: 't1',
    duration: 50,
    serviceName: 'svcB',
    depth: 1,
    offset: 10,
    skew: 0,
    color: 'blue',
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
  };
  const itemC: TraceWaterfallItem = {
    id: 'c',
    parentId: 'a',
    name: 'C',
    timestampUs: 0,
    traceId: 't1',
    duration: 30,
    serviceName: 'svcC',
    depth: 1,
    offset: 20,
    skew: 0,
    color: 'green',
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
  };
  const itemD: TraceWaterfallItem = {
    id: 'd',
    parentId: 'b',
    name: 'D',
    timestampUs: 0,
    traceId: 't1',
    duration: 10,
    serviceName: 'svcD',
    depth: 2,
    offset: 30,
    skew: 0,
    color: 'yellow',
    errors: [],
    spanLinksCount: { incoming: 0, outgoing: 0 },
  };

  const treeMap = {
    a: [itemB, itemC],
    b: [itemD],
  };

  it('returns an empty array if root is undefined', () => {
    const result = convertTreeToList(treeMap, {}, undefined);
    expect(result).toEqual([]);
  });

  it('returns only the root if there are no children', () => {
    const result = convertTreeToList({}, {}, itemA);
    expect(result).toEqual([itemA]);
  });

  it('returns all items in depth-first order when all accordions are open', () => {
    const accordionsState: Record<string, EuiAccordionProps['forceState']> = {
      a: 'open',
      b: 'open',
      c: 'open',
      d: 'open',
    };
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    // Should be: a, b, d, c
    expect(result).toEqual([itemA, itemB, itemD, itemC]);
  });

  it('skips children if accordion is closed', () => {
    const accordionsState: Record<string, EuiAccordionProps['forceState']> = {
      a: 'open',
      b: 'closed',
      c: 'open',
      d: 'open',
    };
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    // Should be: a, b, c (d is not included because b is closed)
    expect(result).toEqual([itemA, itemB, itemC]);
  });

  it('defaults to open if accordion state is missing', () => {
    const accordionsState = {}; // No state provided, should default to open
    const result = convertTreeToList(treeMap, accordionsState, itemA);
    expect(result).toEqual([itemA, itemB, itemD, itemC]);
  });
});

describe('TraceWaterfall', () => {
  afterEach(() => {
    cleanup();
  });

  const mockTraceItems: TraceItem[] = [
    {
      id: 'trace-1',
      parentId: undefined,
      traceId: 'trace-1',
      name: 'Test Transaction',
      serviceName: 'test-service',
      duration: 100,
      timestampUs: 0,
      errors: [],
      spanLinksCount: { incoming: 0, outgoing: 0 },
    },
    {
      id: 'span-1',
      parentId: 'trace-1',
      traceId: 'trace-1',
      name: 'Test Span 1',
      serviceName: 'test-service',
      duration: 50,
      timestampUs: 0,
      errors: [],
      spanLinksCount: { incoming: 0, outgoing: 0 },
    },
    {
      id: 'span-2',
      parentId: 'span-1',
      traceId: 'trace-1',
      name: 'Test Span 2',
      serviceName: 'test-service',
      duration: 30,
      timestampUs: 0,
      errors: [],
      spanLinksCount: { incoming: 0, outgoing: 0 },
    },
  ];

  const renderTraceWaterfall = (
    props: Partial<React.ComponentProps<typeof TraceWaterfall>> = {}
  ) => {
    return render(
      <EuiThemeProvider>
        <TraceWaterfall traceItems={mockTraceItems} {...props} />
      </EuiThemeProvider>
    );
  };

  describe('WaterfallAccordionButton', () => {
    it('renders WaterfallAccordionButton when showAccordion is true', () => {
      renderTraceWaterfall({ showAccordion: true });

      expect(screen.getByTestId('traceWaterfallAccordionButton')).toBeInTheDocument();
    });

    it('does not render WaterfallAccordionButton when showAccordion is false', () => {
      renderTraceWaterfall({ showAccordion: false });

      expect(screen.queryByTestId('traceWaterfallAccordionButton')).not.toBeInTheDocument();
    });

    it('toggles accordion state when WaterfallAccordionButton is clicked', () => {
      renderTraceWaterfall({ showAccordion: true });

      const accordionButton = screen.getByTestId('traceWaterfallAccordionButton');

      expect(accordionButton.querySelector('[data-euiicon-type="fold"]')).toBeInTheDocument();
      expect(accordionButton).toHaveAttribute('aria-label', 'Click to fold the waterfall');

      expect(screen.getByText('Test Transaction')).toBeInTheDocument();
      expect(screen.getByText('Test Span 1')).toBeInTheDocument();
      expect(screen.getByText('Test Span 2')).toBeInTheDocument();

      fireEvent.click(accordionButton);

      expect(accordionButton.querySelector('[data-euiicon-type="unfold"]')).toBeInTheDocument();
      expect(accordionButton).toHaveAttribute('aria-label', 'Click to unfold the waterfall');

      expect(screen.getByText('Test Transaction')).toBeInTheDocument();
      expect(screen.queryByText('Test Span 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Span 2')).not.toBeInTheDocument();

      fireEvent.click(accordionButton);

      expect(accordionButton.querySelector('[data-euiicon-type="fold"]')).toBeInTheDocument();
      expect(accordionButton).toHaveAttribute('aria-label', 'Click to fold the waterfall');

      expect(screen.getByText('Test Transaction')).toBeInTheDocument();
      expect(screen.getByText('Test Span 1')).toBeInTheDocument();
      expect(screen.getByText('Test Span 2')).toBeInTheDocument();
    });
  });

  describe('Critical Path Control', () => {
    it('does not render critical path control when showCriticalPathControl is false', () => {
      renderTraceWaterfall({ showCriticalPathControl: false });

      expect(screen.queryByTestId('criticalPathToggle')).not.toBeInTheDocument();
    });

    it('renders critical path control when showCriticalPathControl is true', () => {
      renderTraceWaterfall({ showCriticalPathControl: true });

      expect(screen.getByTestId('criticalPathToggle')).toBeInTheDocument();
    });
  });

  describe('Virtualization', () => {
    it('uses delegated scroll pattern to prevent scroll issues', () => {
      renderTraceWaterfall({ showAccordion: false });

      const list = screen.getByRole('grid');

      // These style assertions are critical to ensure the delegated scroll pattern works correctly.
      // The List component must use autoHeight to allow WindowScroller to handle scrolling.
      // Without these, the waterfall scroll will break.
      expect(list).toHaveStyle({ height: 'auto' });
      expect(list).toHaveStyle({ overflowY: 'hidden' });
    });

    it('renders the waterfall container with virtualized list', () => {
      renderTraceWaterfall({ showAccordion: false });

      expect(screen.getByTestId('waterfall')).toBeInTheDocument();
      expect(screen.getByRole('grid')).toBeInTheDocument();
    });

    it('renders trace items within the virtualized list', () => {
      renderTraceWaterfall({ showAccordion: false });

      expect(screen.getByText('Test Transaction')).toBeInTheDocument();
      expect(screen.getByText('Test Span 1')).toBeInTheDocument();
      expect(screen.getByText('Test Span 2')).toBeInTheDocument();
    });

    it('renders warning when trace items array is empty', () => {
      renderTraceWaterfall({ traceItems: [], showAccordion: false });

      expect(screen.getByTestId('traceWarning')).toBeInTheDocument();
    });
  });
});
