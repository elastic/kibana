/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { ChartContainer } from './chart_container';

describe('ChartContainer', () => {
  describe('when status is failure', () => {
    it('shows failure message', () => {
      const { getByText } = render(
        <ChartContainer height={100} status={FETCH_STATUS.FAILURE}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(
        getByText(
          'An error happened when trying to fetch data. Please try again'
        )
      ).toBeInTheDocument();
    });
  });

  describe('when status is success', () => {
    it('shows children components', () => {
      const { getByText } = render(
        <ChartContainer height={100} status={FETCH_STATUS.SUCCESS}>
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(getByText('My amazing component')).toBeInTheDocument();
    });
  });
});
