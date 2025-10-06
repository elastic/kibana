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

// Mock dependencies
jest.mock('./bar', () => ({
  Bar: ({ width, left, color }: any) => (
    <div data-test-subj="bar" data-width={width} data-left={left} data-color={color} />
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
jest.mock('./trace_waterfall_context', () => ({
  useTraceWaterfallContext: () => ({
    duration: 100,
    margin: { left: 20, right: 10 },
    showAccordion: true,
    onClick: jest.fn(),
    onErrorClick: jest.fn(),
    highlightedTraceId: 'highlighted-id',
  }),
}));
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        border: { thin: '1px solid #eee', width: { thick: '2px' } },
        colors: { danger: 'red', lightestShade: '#fafafa' },
      },
    }),
  };
});

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
} as TraceWaterfallItem;

describe('TraceItemRow', () => {
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.spyOn(require('./trace_waterfall_context'), 'useTraceWaterfallContext').mockReturnValue({
      duration: 100,
      margin: { left: 20, right: 10 },
      showAccordion: false,
      onClick: jest.fn(),
      onErrorClick: jest.fn(),
      highlightedTraceId: 'highlighted-id',
    });
    const { container } = render(
      <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
    );
    expect(container.querySelector('.euiAccordion')).not.toBeInTheDocument();
  });

  it('applies highlight background when isHighlighted is true', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.spyOn(require('./trace_waterfall_context'), 'useTraceWaterfallContext').mockReturnValue({
      duration: 100,
      margin: { left: 20, right: 10 },
      showAccordion: true,
      onClick: jest.fn(),
      onErrorClick: jest.fn(),
      highlightedTraceId: 'span-1',
    });
    const { getByTestId } = render(
      <TraceItemRow item={baseItem} childrenCount={0} state="closed" onToggle={jest.fn()} />
    );
    expect(getByTestId('trace-item-container')).toHaveStyle('background-color: #fafafa');
  });
});
