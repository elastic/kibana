/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TraceItemRow } from './trace_item_row';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallContextProps } from './trace_waterfall_context';
import { useEuiTheme } from '@elastic/eui';

// Mock dependencies
jest.mock('./bar', () => ({
  Bar: ({ width, left, color, segments }: any) => (
    <div
      data-test-subj="bar"
      data-width={width}
      data-left={left}
      data-color={color}
      data-segments={segments ? JSON.stringify(segments) : undefined}
    />
  ),
}));
jest.mock('./bar_details', () => ({
  BarDetails: ({ item, left }: any) => (
    <div data-test-subj="bar-details" data-item={item.id} data-left={left} />
  ),
}));
jest.mock('./toggle_accordion_button', () => ({
  TOGGLE_BUTTON_WIDTH: 10,
  ToggleAccordionButton: ({ isOpen, childrenCount, onClick }: any) => (
    <button
      data-test-subj="toggle-btn"
      data-open={isOpen}
      data-count={childrenCount}
      onClick={onClick}
    >
      Toggle
    </button>
  ),
}));
jest.mock('./trace_waterfall_context');
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: jest.fn(),
  };
});

const mockUseTraceWaterfallContext = useTraceWaterfallContext as jest.MockedFunction<
  typeof useTraceWaterfallContext
>;
const mockUseEuiTheme = useEuiTheme as jest.MockedFunction<typeof useEuiTheme>;

const baseItem = {
  id: 'span-1',
  duration: 50,
  offset: 10,
  skew: 0,
  color: 'red',
  depth: 2,
  errors: [],
  timestampUs: 100,
  name: 'Test Span',
  traceId: 'trace-1',
  serviceName: 'Test Service',
  spanLinksCount: { incoming: 0, outgoing: 0 },
} as TraceWaterfallItem;

describe('TraceItemRow', () => {
  beforeEach(() => {
    mockUseTraceWaterfallContext.mockReturnValue({
      duration: 100,
      margin: { left: 20, right: 10 },
      showAccordion: true,
      onClick: jest.fn(),
      onErrorClick: jest.fn(),
      highlightedTraceId: 'highlighted-id',
      criticalPathSegmentsById: {},
      showCriticalPath: false,
    } as unknown as TraceWaterfallContextProps);

    mockUseEuiTheme.mockReturnValue({
      euiTheme: {
        border: { thin: '1px solid #eee', width: { thick: '2px' } },
        colors: { danger: 'red', lightestShade: '#fafafa' },
      },
    } as any);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });
  it('renders Bar and BarDetails with correct props', () => {
    const { getByTestId } = render(
      <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
    );
    expect(getByTestId('bar')).toHaveAttribute('data-width', '50');
    expect(getByTestId('bar')).toHaveAttribute('data-left', '10');
    expect(getByTestId('bar')).toHaveAttribute('data-color', 'red');
    expect(getByTestId('bar-details')).toHaveAttribute('data-item', 'span-1');
    expect(getByTestId('bar-details')).toHaveAttribute('data-left', '10');
  });

  it('renders ToggleAccordionButton when hasToggle is true', () => {
    const { getByTestId } = render(
      <TraceItemRow item={baseItem} childrenCount={2} state="open" onToggle={jest.fn()} />
    );
    expect(getByTestId('toggle-btn')).toBeInTheDocument();
    expect(getByTestId('toggle-btn')).toHaveAttribute('data-open', 'true');
    expect(getByTestId('toggle-btn')).toHaveAttribute('data-count', '2');
  });

  it('calls onToggle when ToggleAccordionButton is clicked', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <TraceItemRow item={baseItem} childrenCount={2} state="open" onToggle={onToggle} />
    );
    fireEvent.click(getByTestId('toggle-btn'));
    expect(onToggle).toHaveBeenCalledWith('span-1');
  });

  it('renders EuiAccordion when showAccordion is true', () => {
    const { container } = render(
      <TraceItemRow item={baseItem} childrenCount={2} state="open" onToggle={jest.fn()} />
    );
    expect(container.querySelector('.euiAccordion')).toBeInTheDocument();
  });

  it('renders only content when showAccordion is false', () => {
    mockUseTraceWaterfallContext.mockReturnValue({
      duration: 100,
      margin: { left: 20, right: 10 },
      showAccordion: false,
      onClick: jest.fn(),
      onErrorClick: jest.fn(),
      highlightedTraceId: 'highlighted-id',
      criticalPathSegmentsById: {},
      showCriticalPath: false,
    } as unknown as TraceWaterfallContextProps);
    const { container } = render(
      <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
    );
    expect(container.querySelector('.euiAccordion')).not.toBeInTheDocument();
  });

  it('applies highlight background when isHighlighted is true', () => {
    mockUseTraceWaterfallContext.mockReturnValue({
      duration: 100,
      margin: { left: 20, right: 10 },
      showAccordion: true,
      onClick: jest.fn(),
      onErrorClick: jest.fn(),
      highlightedTraceId: 'span-1',
      criticalPathSegmentsById: {},
      showCriticalPath: false,
    } as unknown as TraceWaterfallContextProps);
    const { getByTestId } = render(
      <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
    );
    expect(getByTestId('trace-item-container')).toHaveStyle('background-color: #fafafa');
  });

  describe('with critical path', () => {
    beforeEach(() => {
      mockUseEuiTheme.mockReturnValue({
        euiTheme: {
          border: { thin: '1px solid #eee', width: { thick: '2px' } },
          colors: { danger: 'red', lightestShade: '#fafafa', accent: 'orange' },
        },
      } as any);
    });

    it('renders without segments when criticalPathSegmentsById is undefined', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 100,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {},
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      expect(bar).not.toHaveAttribute('data-segments');
    });

    it('renders without segments when criticalPathSegmentsById has no segments for item', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 100,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {
          'other-span': [],
        },
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      expect(bar).not.toHaveAttribute('data-segments');
    });

    it('filters segments to only include self:true segments', () => {
      const item = { ...baseItem, offset: 10, duration: 100, skew: 0 };
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 200,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {
          'span-1': [
            { item, offset: 20, duration: 30, self: true },
            { item, offset: 50, duration: 40, self: false },
            { item, offset: 90, duration: 10, self: true },
          ],
        },
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={item} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      const segments = JSON.parse(bar.getAttribute('data-segments') || '[]');
      expect(segments).toHaveLength(2);
    });

    it('calculates segment left position correctly', () => {
      const item = { ...baseItem, offset: 10, duration: 100, skew: 5 };
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 200,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {
          'span-1': [
            { item, offset: 25, duration: 30, self: true }, // (25 - 10 - 5) / 100 = 0.1
          ],
        },
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={item} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      const segments = JSON.parse(bar.getAttribute('data-segments') || '[]');
      expect(segments[0].left).toBe(0.1);
    });

    it('calculates segment width correctly', () => {
      const item = { ...baseItem, offset: 10, duration: 100, skew: 0 };
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 200,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {
          'span-1': [
            { item, offset: 20, duration: 30, self: true }, // 30 / 100 = 0.3
          ],
        },
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={item} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      const segments = JSON.parse(bar.getAttribute('data-segments') || '[]');
      expect(segments[0].width).toBe(0.3);
    });

    it('preserves segment id and uses accent color', () => {
      const item = { ...baseItem, offset: 10, duration: 100, skew: 0 };
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 200,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {
          'span-1': [{ item, offset: 20, duration: 30, self: true }],
        },
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={item} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      const segments = JSON.parse(bar.getAttribute('data-segments') || '[]');
      expect(segments[0].id).toBe('span-1');
      expect(segments[0].color).toBe('orange');
    });

    it('applies transparent color when showCriticalPath is true', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 100,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: true,
        criticalPathSegmentsById: {},
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      const color = bar.getAttribute('data-color');
      // transparentize(0.5, 'red') should make the color more transparent
      expect(color).not.toBe('red');
      expect(color).toContain('rgba');
    });

    it('applies normal color when showCriticalPath is false', () => {
      mockUseTraceWaterfallContext.mockReturnValue({
        duration: 100,
        margin: { left: 20, right: 10 },
        showAccordion: true,
        onClick: jest.fn(),
        highlightedTraceId: 'highlighted-id',
        showCriticalPath: false,
        criticalPathSegmentsById: {},
      } as unknown as TraceWaterfallContextProps);
      const { getByTestId } = render(
        <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
      );
      const bar = getByTestId('bar');
      expect(bar).toHaveAttribute('data-color', 'red');
    });
  });
});
