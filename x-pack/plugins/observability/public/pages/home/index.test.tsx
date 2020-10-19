/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as hasData from '../../hooks/use_has_data';
import { render } from '../../utils/test_helper';
import { HomePage } from './';

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('Home page', () => {
  beforeAll(() => {
    jest.restoreAllMocks();
  });

  it('renders loading component while requests are not returned', () => {
    jest
      .spyOn(hasData, 'useHasData')
      .mockImplementation(() => ({ hasData: {}, hasAnyData: false, isAllRequestsComplete: false }));
    const { getByText } = render(<HomePage />);
    expect(getByText('Loading Observability')).toBeInTheDocument();
  });
  it('renders landing page', () => {
    jest
      .spyOn(hasData, 'useHasData')
      .mockImplementation(() => ({ hasData: {}, hasAnyData: false, isAllRequestsComplete: true }));
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/landing' });
  });
  it('renders overview page', () => {
    jest
      .spyOn(hasData, 'useHasData')
      .mockImplementation(() => ({ hasData: {}, hasAnyData: true, isAllRequestsComplete: false }));
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/overview' });
  });
});
