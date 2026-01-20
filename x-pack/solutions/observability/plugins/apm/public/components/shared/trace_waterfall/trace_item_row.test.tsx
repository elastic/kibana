/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TraceItemRow, getCriticalPathOverlays } from './trace_item_row';
import type { TraceWaterfallItem } from './use_trace_waterfall';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import type { TraceWaterfallContextProps } from './trace_waterfall_context';
import { useEuiTheme } from '@elastic/eui';
import type { CriticalPathSegment } from './critical_path';

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
    <div
      data-test-subj="toggle-btn"
      data-open={isOpen}
      data-count={childrenCount}
      onClick={onClick}
      onKeyDown={onClick}
      role="button"
      tabIndex={0}
    />
  ),
}));
jest.mock('./trace_waterfall_context');

const MockEuiAccordion = jest.fn();
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: jest.fn(),
    EuiAccordion: (props: any) => {
      MockEuiAccordion(props);
      return <actual.EuiAccordion {...props} />;
    },
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
    MockEuiAccordion.mockClear();

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

  /**
   * Regression test: EUI forces arrow display when buttonElement="div" for accessibility.
   * We hide it via arrowProps.css since we use our own ToggleAccordionButton.
   */
  it('passes arrowProps with display:none to hide EUI forced arrow', () => {
    render(<TraceItemRow item={baseItem} childrenCount={2} state="open" onToggle={jest.fn()} />);

    expect(MockEuiAccordion).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonElement: 'div',
        arrowDisplay: 'none',
        arrowProps: expect.objectContaining({
          css: expect.objectContaining({
            styles: expect.stringContaining('display:none'),
          }),
        }),
      })
    );
  });
});

describe('getCriticalPathOverlays', () => {
  const mockItem = (overrides = {}): TraceWaterfallItem =>
    ({
      id: 'test-span',
      duration: 100,
      offset: 50,
      skew: 0,
      color: 'blue',
      depth: 1,
      errors: [],
      timestampUs: 1000,
      name: 'Test Item',
      traceId: 'test-trace',
      serviceName: 'test-service',
      spanLinksCount: { incoming: 0, outgoing: 0 },
      ...overrides,
    } as TraceWaterfallItem);

  const mockSegment = (
    item: TraceWaterfallItem,
    offset: number,
    duration: number,
    self: boolean
  ): CriticalPathSegment<TraceWaterfallItem> => ({
    item,
    offset,
    duration,
    self,
  });

  it('returns undefined when segments is undefined', () => {
    const result = getCriticalPathOverlays(undefined, mockItem(), 'orange');
    expect(result).toBeUndefined();
  });

  it('returns empty array when segments array is empty', () => {
    const result = getCriticalPathOverlays([], mockItem(), 'orange');
    expect(result).toEqual([]);
  });

  it('filters out segments where self is false', () => {
    const item = mockItem({ offset: 0, duration: 100, skew: 0 });
    const item1 = mockItem({ id: 'segment-1', offset: 0, duration: 100, skew: 0 });
    const item2 = mockItem({ id: 'segment-2', offset: 0, duration: 100, skew: 0 });
    const item3 = mockItem({ id: 'segment-3', offset: 0, duration: 100, skew: 0 });
    const item4 = mockItem({ id: 'segment-4', offset: 0, duration: 100, skew: 0 });

    const segments = [
      mockSegment(item1, 10, 20, true),
      mockSegment(item2, 30, 15, false),
      mockSegment(item3, 50, 30, true),
      mockSegment(item4, 80, 10, false),
    ];

    const result = getCriticalPathOverlays(segments, item, 'purple');

    expect(result).toHaveLength(2);
    expect(result?.map((s) => s.id)).toEqual(['segment-1', 'segment-3']);
  });

  it('calculates position with offset and skew', () => {
    const item = mockItem({ offset: 100, duration: 200, skew: 10 });
    const segments = [mockSegment(item, 150, 50, true), mockSegment(item, 220, 40, true)];

    const result = getCriticalPathOverlays(segments, item, 'orange');

    expect(result).toEqual([
      { id: 'test-span', color: 'orange', left: 0.2, width: 0.25 },
      { id: 'test-span', color: 'orange', left: 0.55, width: 0.2 },
    ]);
  });
});
