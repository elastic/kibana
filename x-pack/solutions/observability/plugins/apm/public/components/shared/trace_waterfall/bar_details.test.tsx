/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BarDetails } from './bar_details';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';

jest.mock('../../../../common/utils/formatters', () => ({
  asDuration: (value: number) => `${value} ms`,
}));

describe('BarDetails', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  const mockItem = {
    name: 'Test Span',
    duration: 1234,
  } as unknown as TraceItem;

  it('renders the span name and formatted duration', () => {
    const { getByText } = render(<BarDetails item={mockItem} left={10} />);
    expect(getByText('Test Span')).toBeInTheDocument();
    expect(getByText('1234 ms')).toBeInTheDocument();
  });

  it('applies correct min-width style based on left prop', () => {
    const { container } = render(<BarDetails item={mockItem} left={30} />);
    const flexGroup = container.querySelector('.euiFlexGroup');
    expect(flexGroup).toHaveStyle(`min-width: 70%`);
  });

  it('does not set negative min-width', () => {
    const { container } = render(<BarDetails item={mockItem} left={150} />);
    const flexGroup = container.querySelector('.euiFlexGroup');
    expect(flexGroup).toHaveStyle(`min-width: 0%`);
  });

  it('applies 8px margin-right to the last EuiFlexItem', () => {
    const { container } = render(<BarDetails item={mockItem} left={10} />);
    const flexItems = container.querySelectorAll('.euiFlexGroup > .euiFlexItem');
    const lastFlexItem = flexItems[flexItems.length - 1];
    expect(window.getComputedStyle(lastFlexItem).marginRight).toBe('8px');
  });
});
