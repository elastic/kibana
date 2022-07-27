/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { SignalsByCategory } from './signals_by_category';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    useLocation: jest.fn().mockReturnValue({ pathname: '' }),
  };
});

const mockUseFiltersForSignals = jest.fn(() => []);
jest.mock('./use_filters_for_signals_by_category', () => ({
  useFiltersForSignalsByCategory: () => mockUseFiltersForSignals(),
}));

const props = {
  query: {
    query: '',
    language: 'kuery',
  },
  filters: [],
};

const renderComponent = () =>
  render(
    <TestProviders>
      <SignalsByCategory {...props} />
    </TestProviders>
  );

describe('SignalsByCategory', () => {
  it('Renders to the page', () => {
    act(() => {
      const { getByText } = renderComponent();
      expect(getByText('Alert trend')).toBeInTheDocument();
    });
  });
});
