/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import { IntervalAbbrScreenReader } from '.';

describe('IntervalAbbrScreenReader', () => {
  test('should add screen reader text for 35s', () => {
    render(
      <TestProviders>
        <IntervalAbbrScreenReader interval="35s" />
      </TestProviders>
    );
    expect(screen.getByText('35 seconds')).toBeDefined();
  });

  test('should add screen reader text for 1m', () => {
    render(
      <TestProviders>
        <IntervalAbbrScreenReader interval="1m" />
      </TestProviders>
    );
    expect(screen.getByText('1 minute')).toBeDefined();
  });

  test('should add screen reader text for 2h', () => {
    render(
      <TestProviders>
        <IntervalAbbrScreenReader interval="2h" />
      </TestProviders>
    );
    expect(screen.getByText('2 hours')).toBeDefined();
  });
});
