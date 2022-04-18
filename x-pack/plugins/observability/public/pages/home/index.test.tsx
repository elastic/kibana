/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HasDataContextValue } from '../../context/has_data_context';
import * as hasData from '../../hooks/use_has_data';
import { render } from '../../utils/test_helper';
import { HomePage } from '.';

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    replace: mockHistoryPush,
  }),
}));

describe('Home page', () => {
  beforeAll(() => {
    jest.restoreAllMocks();
  });

  it('renders loading component while requests are not returned', () => {
    jest.spyOn(hasData, 'useHasData').mockImplementation(
      () =>
        ({
          hasDataMap: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
        } as HasDataContextValue)
    );
    const { getByText } = render(<HomePage />);
    expect(getByText('Loading Observability')).toBeInTheDocument();
  });
  it('renders landing page', () => {
    jest.spyOn(hasData, 'useHasData').mockImplementation(
      () =>
        ({
          hasDataMap: {},
          hasAnyData: false,
          isAllRequestsComplete: true,
        } as HasDataContextValue)
    );
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/landing' });
  });
  it('renders overview page', () => {
    jest.spyOn(hasData, 'useHasData').mockImplementation(
      () =>
        ({
          hasDataMap: {},
          hasAnyData: true,
          isAllRequestsComplete: false,
        } as HasDataContextValue)
    );
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/overview' });
  });
});
