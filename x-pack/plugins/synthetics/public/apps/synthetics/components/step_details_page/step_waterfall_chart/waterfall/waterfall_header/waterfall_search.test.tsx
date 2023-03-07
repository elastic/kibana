/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent } from '@testing-library/react';
import 'jest-canvas-mock';
import { WaterfallSearch } from './waterfall_search';
import { FILTER_REQUESTS_LABEL } from '../translations';
import { render } from '../../../../../utils/testing';

describe('waterfall filter', () => {
  jest.useFakeTimers();
  const query = '';
  const setQuery = jest.fn();
  const defaultProps = {
    query,
    setQuery,
    totalNetworkRequests: 10,
    highlightedNetworkRequests: 5,
    fetchedNetworkRequests: 10,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<WaterfallSearch {...defaultProps} />);

    expect(getByText('Network Requests'));
  });

  it('search input is working properly', () => {
    const Component = () => {
      return <WaterfallSearch {...defaultProps} />;
    };
    const { getByLabelText } = render(<Component />);

    const testText = 'js';

    fireEvent.change(getByLabelText(FILTER_REQUESTS_LABEL), { target: { value: testText } });

    // input has debounce effect so hence the timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(setQuery).toHaveBeenCalledWith(testText);
  });
});
