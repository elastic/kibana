/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { FlyoutLoading } from './flyout_loading';
import { FLYOUT_LOADING_TEST_ID } from './test_ids';

describe('<FlyoutLoading />', () => {
  it('should render loading', () => {
    const { getByTestId } = render(<FlyoutLoading />);
    expect(getByTestId(FLYOUT_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render loading when data test subject is passed', () => {
    const { getByTestId, queryByTestId } = render(<FlyoutLoading data-test-subj="test-id" />);
    expect(getByTestId('test-id')).toBeInTheDocument();
    expect(queryByTestId(FLYOUT_LOADING_TEST_ID)).not.toBeInTheDocument();
  });
});
