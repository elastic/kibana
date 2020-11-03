/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { ChartContainer } from './chart_container';

describe('ChartContainer', () => {
  describe('when isLoading is true', () => {
    it('shows loading the indicator', () => {
      const component = render(
        <ChartContainer height={100} isLoading={true}>
          <div>My amazing component</div>
        </ChartContainer>
      );

      expect(component.getByTestId('loading')).toBeInTheDocument();
    });
  });

  describe('when isLoading is false', () => {
    it('does not show the loading indicator', () => {
      const component = render(
        <ChartContainer height={100} isLoading={false}>
          <div>My amazing component</div>
        </ChartContainer>
      );

      expect(component.queryByTestId('loading')).not.toBeInTheDocument();
    });
  });
});
