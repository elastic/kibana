/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { Props } from './trace_item_row';
import { TraceItemRow } from './trace_item_row';
import type { FlattenedTraceItem } from '.';

jest.mock('./bar', () => ({
  Bar: ({ width, left, color }: { width: number; left: number; color: string }) => (
    <div data-test-subj="bar" data-width={width} data-left={left} data-color={color} />
  ),
}));
jest.mock('./bar_details', () => ({
  BarDetails: ({ item, left }: { item: any; left: number }) => (
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

const baseItem = {
  id: 'span-1',
  duration: 100,
  offset: 0,
  skew: 0,
  color: 'red',
  depth: 1,
} as FlattenedTraceItem;

const baseProps = {
  item: baseItem,
  duration: 200,
  state: 'closed' as const,
  onToggle: jest.fn(),
  margin: { left: 20, right: 10 },
  showAccordion: false,
} as Props;

describe('TraceItemRow', () => {
  it('renders Bar and BarDetails with correct props', () => {
    const { getByTestId } = render(<TraceItemRow {...baseProps} />);
    expect(getByTestId('bar')).toHaveAttribute('data-width', '50');
    expect(getByTestId('bar')).toHaveAttribute('data-left', '0');
    expect(getByTestId('bar')).toHaveAttribute('data-color', 'red');
    expect(getByTestId('bar-details')).toHaveAttribute('data-item', 'span-1');
    expect(getByTestId('bar-details')).toHaveAttribute('data-left', '0');
  });

  it('renders children when showAccordion is false', () => {
    const { getByText } = render(
      <TraceItemRow {...baseProps}>{[<div key={1}>Child Content</div>]}</TraceItemRow>
    );
    expect(getByText('Child Content')).toBeInTheDocument();
  });

  it('renders EuiAccordion when showAccordion is true', () => {
    const { container } = render(<TraceItemRow {...baseProps} showAccordion={true} />);
    expect(container.querySelector('.accordion__buttonContent')).toBeInTheDocument();
  });

  it('calls onToggle when ToggleAccordionButton is clicked', () => {
    const onToggle = jest.fn();
    const children = [<div key="c">Child</div>];
    const { getByTestId } = render(
      <TraceItemRow {...baseProps} showAccordion={true} children={children} onToggle={onToggle} />
    );
    fireEvent.click(getByTestId('toggle-btn'));
    expect(onToggle).toHaveBeenCalledWith('span-1');
  });

  it('calls onClick when Bar column is clicked', () => {
    const onClick = jest.fn();
    const { getByTestId } = render(<TraceItemRow {...baseProps} onClick={onClick} />);
    const traceBarRow = getByTestId('trace-bar-row');
    fireEvent.click(traceBarRow);
    expect(onClick).toHaveBeenCalledWith('span-1');
  });

  it('renders children when accordion is open', () => {
    const children = [<div key="c">Accordion Child</div>];
    const { getByText } = render(
      <TraceItemRow {...baseProps} showAccordion={true} state="open" children={children} />
    );
    expect(getByText('Accordion Child')).toBeInTheDocument();
  });

  it('hides children when accordion is closed', () => {
    const children = [<div key="c">Accordion Child</div>];
    const { queryByText } = render(
      <TraceItemRow {...baseProps} showAccordion={true} state="closed" children={children} />
    );
    expect(queryByText('Accordion Child')).toBeNull();
  });
});
