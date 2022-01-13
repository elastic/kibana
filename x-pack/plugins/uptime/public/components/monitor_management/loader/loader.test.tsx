/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { Loader } from './loader';

describe('<Loader />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows children when loading and error are both false', () => {
    render(
      <Loader loading={false} error={false} loadingTitle="loading">
        {'children'}
      </Loader>
    );

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  it('shows loading when loading is true', () => {
    render(
      <Loader loading={true} error={true} loadingTitle="loading">
        {'children'}
      </Loader>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('shows error content when error is true ', () => {
    render(
      <Loader
        loading={false}
        error={true}
        loadingTitle="loading"
        errorTitle="A problem occurred"
        errorBody="Please try again"
      >
        {'children'}
      </Loader>
    );

    expect(screen.getByText('A problem occurred')).toBeInTheDocument();
    expect(screen.getByText('Please try again')).toBeInTheDocument();
  });
});
