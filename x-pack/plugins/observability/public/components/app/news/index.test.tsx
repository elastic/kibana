/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { News } from './';
import { EuiThemeProvider } from '../../../typings';

describe('News', () => {
  it('renders resources with all elements', () => {
    const { getByText, getAllByText } = render(
      <EuiThemeProvider>
        <News />
      </EuiThemeProvider>
    );
    expect(getByText("What's new")).toBeInTheDocument();
    expect(getAllByText('Read full story')).not.toEqual([]);
  });
});
