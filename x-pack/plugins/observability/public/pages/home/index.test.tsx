/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { HomePage } from './index';
import * as hasData from '../../hooks/use_has_data';
import { render } from '../../utils/test_helper';

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as object),
  useHistory: () => ({
    push: mockHistoryPush,
  }),
}));

describe('Home page', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });
  it('shows a loading while fetching data', () => {
    jest
      .spyOn(hasData, 'useHasData')
      .mockImplementation(() => ({ hasAnyData: undefined, hasData: {} }));
    const { getByText } = render(<HomePage />);
    expect(getByText('Loading Observability')).toBeInTheDocument();
  });

  it('redirects to overview page when hasAnyData returns true', () => {
    jest.spyOn(hasData, 'useHasData').mockImplementation(() => ({ hasAnyData: true, hasData: {} }));
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/overview' });
  });

  it('redirects to landing page when hasAnyData returns false', () => {
    jest
      .spyOn(hasData, 'useHasData')
      .mockImplementation(() => ({ hasAnyData: false, hasData: {} }));
    render(<HomePage />);
    expect(mockHistoryPush).toHaveBeenCalledWith({ pathname: '/landing' });
  });
});
