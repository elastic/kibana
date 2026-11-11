/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FailureRing } from './failure_ring';
import { describeCompactRate, formatCompactRate } from './compact_rate';
import { getFailureLevel } from './failure_level';
import { MOCK_EUI_THEME_FOR_USE_THEME } from './test_helpers';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
    useEuiFontSize: () => ({ fontSize: '12px' }),
  };
});

describe('FailureRing', () => {
  it('draws the failed share as an arc, and what the node says in the centre', () => {
    render(
      <FailureRing size={48} failedRate={0.25}>
        412/m
      </FailureRing>
    );
    const arc = screen.getByTestId('serviceMapNodeFailureArc');
    const circumference = 2 * Math.PI * 19;
    expect(arc.getAttribute('stroke-dasharray')).toBe(`${0.25 * circumference} ${circumference}`);
    expect(screen.getByText('412/m')).toBeInTheDocument();
  });

  it('draws no arc without failures or when the rate is unknown', () => {
    const { rerender } = render(<FailureRing size={48} failedRate={0} />);
    expect(screen.queryByTestId('serviceMapNodeFailureArc')).not.toBeInTheDocument();
    rerender(<FailureRing size={48} failedRate={null} />);
    expect(screen.queryByTestId('serviceMapNodeFailureArc')).not.toBeInTheDocument();
  });
});

describe('formatCompactRate', () => {
  it.each([
    [0, '0'],
    [0.4, '24/h'],
    [0.05, '3.0/h'],
    [2.5, '2.5/m'],
    [9.96, '10/m'],
    [412.3, '412/m'],
    [999.6, '1.0k/m'],
    [1234, '1.2k/m'],
    [45678, '46k/m'],
  ])('formats %p requests a minute as %p', (value, expected) => {
    expect(formatCompactRate(value)).toBe(expected);
  });
});

describe('describeCompactRate', () => {
  it.each([
    [0, '0 requests per minute'],
    [0.4, '24 requests per hour'],
    [14, '14 requests per minute'],
    [1234, '1.2k requests per minute'],
  ])('describes %p requests a minute as %p for screen readers', (value, expected) => {
    expect(describeCompactRate(value)).toBe(expected);
  });
});

describe('getFailureLevel', () => {
  it.each([
    [undefined, 'none'],
    [0, 'none'],
    [0.004, 'low'],
    [0.01, 'warning'],
    [0.05, 'danger'],
    [0.3, 'danger'],
  ])('rates a %p share of failed requests as %p', (rate, level) => {
    expect(getFailureLevel(rate)).toBe(level);
  });

  it('does not colour a rate over fewer than 20 requests', () => {
    expect(getFailureLevel(0.5, 4)).toBe('low');
    expect(getFailureLevel(0.5, 20)).toBe('danger');
  });
});
