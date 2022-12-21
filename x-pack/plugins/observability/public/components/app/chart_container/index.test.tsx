/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ChartContainer } from '.';

describe('chart container', () => {
  it('shows loading indicator', () => {
    const component = render(
      <ChartContainer height={100} isInitialLoad={true}>
        <div>My amazing component</div>
      </ChartContainer>
    );
    expect(component.getByTestId('loading')).toBeInTheDocument();
    expect(component.queryByText('My amazing component')).not.toBeInTheDocument();
  });
  it("doesn't show loading indicator", () => {
    const component = render(
      <ChartContainer height={100} isInitialLoad={false}>
        <div>My amazing component</div>
      </ChartContainer>
    );
    expect(component.queryByTestId('loading')).not.toBeInTheDocument();
    expect(component.getByText('My amazing component')).toBeInTheDocument();
  });
});
