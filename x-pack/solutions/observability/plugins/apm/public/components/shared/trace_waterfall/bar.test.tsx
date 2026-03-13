/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { renderWithTheme } from '../../../utils/test_helpers';
import type { Bar } from './bar';
import { Bar as BarComponent, getBarStyle } from './bar';

function renderBar(props: ComponentProps<typeof Bar>) {
  const { container } = renderWithTheme(<BarComponent {...props} />);
  return container.firstChild as HTMLElement;
}

describe('Bar', () => {
  it('renders with correct width, left, and color styles', () => {
    const barDiv = renderBar({ width: 50, left: 10, color: 'red' });
    expect(barDiv).toBeInTheDocument();
    expect(barDiv).toHaveStyle('width: 50%');
    expect(barDiv).toHaveStyle('margin-left: 10%');
    expect(barDiv).toHaveStyle('background-color: red');
    expect(barDiv).toHaveStyle('height: 16px');
  });

  it('renders with 0 width and left', () => {
    const barDiv = renderBar({ width: 0, left: 0, color: 'blue' });
    expect(barDiv).toHaveStyle('width: 0%');
    expect(barDiv).toHaveStyle('margin-left: 0%');
    expect(barDiv).toHaveStyle('background-color: blue');
  });

  it('renders with 100% width and 100% left', () => {
    const barDiv = renderBar({ width: 100, left: 100, color: '#fff' });
    expect(barDiv).toHaveStyle('width: 100%');
    expect(barDiv).toHaveStyle('margin-left: 100%');
    expect(barDiv).toHaveStyle('background-color: #fff');
  });

  describe('with segments', () => {
    it('renders without segments when not provided', () => {
      const barDiv = renderBar({ width: 50, left: 10, color: 'red', segments: undefined });
      expect(barDiv.children).toHaveLength(0);
    });

    it('renders without segments when empty array is provided', () => {
      const barDiv = renderBar({ width: 50, left: 10, color: 'red', segments: [] });
      expect(barDiv.children).toHaveLength(0);
    });

    it('renders segments with correct positioning and color', () => {
      const segments = [
        { id: 'segment-1', left: 0.1, width: 0.2, color: 'blue' },
        { id: 'segment-2', left: 0.5, width: 0.3, color: 'green' },
      ];
      const barDiv = renderBar({ width: 50, left: 10, color: 'red', segments });
      const overlayContainer = barDiv.firstChild as HTMLElement;

      expect(overlayContainer).toBeInTheDocument();
      expect(overlayContainer.children).toHaveLength(2);

      const [segment1, segment2] = Array.from(overlayContainer.children) as HTMLElement[];

      expect(segment1).toHaveStyle('left: 10%');
      expect(segment1).toHaveStyle('width: 20%');
      expect(segment1).toHaveStyle('background-color: blue');

      expect(segment2).toHaveStyle('left: 50%');
      expect(segment2).toHaveStyle('width: 30%');
      expect(segment2).toHaveStyle('background-color: green');
    });
  });

  describe('with composite spans', () => {
    it('render segments correctly when composite is provided', () => {
      const segments = [
        { id: 'segment-1', left: 0.1, width: 0.2, color: 'blue' },
        { id: 'segment-2', left: 0.5, width: 0.3, color: 'green' },
      ];

      const barDiv = renderBar({
        width: 50,
        left: 10,
        color: 'red',
        duration: 60000,
        composite: { count: 9, sum: 45000 },
        segments,
      });

      expect(barDiv).toHaveStyle('background-color: transparent');

      const overlayContainer = barDiv.firstChild as HTMLElement;
      expect(overlayContainer).toBeInTheDocument();
      expect(overlayContainer.children).toHaveLength(2);

      const [segment1, segment2] = Array.from(overlayContainer.children) as HTMLElement[];

      expect(segment1).toHaveStyle('left: 10%');
      expect(segment1).toHaveStyle('width: 20%');
      expect(segment1).toHaveStyle('background-color: blue');

      expect(segment2).toHaveStyle('left: 50%');
      expect(segment2).toHaveStyle('width: 30%');
      expect(segment2).toHaveStyle('background-color: green');
    });

    it('applies solid background when composite is not provided', () => {
      const barDiv = renderBar({
        width: 50,
        left: 10,
        color: 'blue',
      });

      expect(barDiv).toHaveStyle('background-color: blue');
    });
  });

  describe('getBarStyle helper', () => {
    it('returns solid background when duration is undefined', () => {
      const result = getBarStyle('blue', undefined, { count: 9, sum: 45000 });

      expect(result.backgroundColor).toBe('blue');
      expect(result.backgroundImage).toBeUndefined();
    });

    it('returns solid background when duration is zero', () => {
      const result = getBarStyle('blue', 0, { count: 9, sum: 45000 });

      expect(result.backgroundColor).toBe('blue');
      expect(result.backgroundImage).toBeUndefined();
    });

    it('returns solid background when composite is undefined', () => {
      const result = getBarStyle('blue', 60000, undefined);

      expect(result.backgroundColor).toBe('blue');
      expect(result.backgroundImage).toBeUndefined();
    });

    it('returns solid background when composite.count is zero', () => {
      const result = getBarStyle('blue', 60000, { count: 0, sum: 45000 });

      expect(result.backgroundColor).toBe('blue');
      expect(result.backgroundImage).toBeUndefined();
    });

    it('returns striped gradient pattern when duration and composite are correctly provided', () => {
      const result = getBarStyle('blue', 60000, { count: 9, sum: 45000 });

      expect(result.backgroundColor).toBe('transparent');
      expect(result.backgroundImage).toContain('repeating-linear-gradient');
      expect(result.backgroundImage).toContain('blue');
    });

    it('calculates correct percentages when sum equals duration', () => {
      const result = getBarStyle('blue', 100000, { count: 4, sum: 100000 });

      // percNumItems = 100 / 4 = 25%
      // percDuration = 25 * 1 = 25%
      expect(result.backgroundImage).toContain('25%');
    });

    it('calculates narrower stripes when sum is less than duration', () => {
      const result = getBarStyle('blue', 100000, { count: 10, sum: 50000 });

      // percNumItems = 100 / 10 = 10%
      // percDuration = 10 * 0.5 = 5%
      expect(result.backgroundImage).toContain('5%');
      expect(result.backgroundImage).toContain('10%');
    });
  });
});
