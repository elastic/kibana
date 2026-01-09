/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { renderWithTheme } from '../../../utils/test_helpers';
import type { BarSegments } from './bar_segments';
import { BarSegments as BarSegmentsComponent } from './bar_segments';

function renderBarSegments(props: ComponentProps<typeof BarSegments>) {
  const { container } = renderWithTheme(<BarSegmentsComponent {...props} />);
  return container.firstChild as HTMLElement | null;
}

describe('BarSegments', () => {
  it('renders segments with correct positioning and colors', () => {
    const segments = [
      { id: 'segment-1', left: 0.1, width: 0.2, color: 'blue' },
      { id: 'segment-2', left: 0.5, width: 0.3, color: 'green' },
    ];
    const container = renderBarSegments({ segments });

    expect(container).toBeInTheDocument();
    expect(container!.children).toHaveLength(2);

    const [segment1, segment2] = Array.from(container!.children) as HTMLElement[];

    expect(segment1).toHaveStyle('left: 10%');
    expect(segment1).toHaveStyle('width: 20%');
    expect(segment1).toHaveStyle('background-color: blue');
    expect(segment1).toHaveStyle('height: 8px');
    expect(segment1).toHaveStyle('min-width: 2px');

    expect(segment2).toHaveStyle('left: 50%');
    expect(segment2).toHaveStyle('width: 30%');
    expect(segment2).toHaveStyle('background-color: green');
    expect(segment2).toHaveStyle('height: 8px');
    expect(segment2).toHaveStyle('min-width: 2px');
  });

  it('applies correct container styles', () => {
    const segments = [{ id: 'segment-1', left: 0, width: 1, color: 'blue' }];
    const container = renderBarSegments({ segments });

    expect(container).toHaveStyle('position: relative');
    expect(container).toHaveStyle('height: 8px');
    expect(container).toHaveStyle('min-width: 2px');
    expect(container).toHaveStyle('background-color: transparent');
    expect(container).toHaveStyle('display: flex');
    expect(container).toHaveStyle('flex-direction: row');
  });
});
