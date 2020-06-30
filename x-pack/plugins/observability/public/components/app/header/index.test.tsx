/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Header } from './';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '../../../typings';

describe('Header', () => {
  it('renders without add data button', () => {
    const { getByText, queryAllByText, getByTestId } = render(
      <EuiThemeProvider>
        <Header color="#fff" />
      </EuiThemeProvider>
    );
    expect(getByTestId('observability-logo')).toBeInTheDocument();
    expect(getByText('Observability')).toBeInTheDocument();
    expect(queryAllByText('Add data')).toEqual([]);
  });
  it('renders with add data button', () => {
    const { getByText, getByTestId } = render(
      <EuiThemeProvider>
        <Header color="#fff" showAddData />
      </EuiThemeProvider>
    );
    expect(getByTestId('observability-logo')).toBeInTheDocument();
    expect(getByText('Observability')).toBeInTheDocument();
    expect(getByText('Add data')).toBeInTheDocument();
  });
});
