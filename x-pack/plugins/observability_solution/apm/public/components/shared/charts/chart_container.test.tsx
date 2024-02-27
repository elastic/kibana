/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ChartContainer } from './chart_container';

describe('ChartContainer', () => {
  describe('loading indicator', () => {
    it('shows loading when status equals to Loading or Not initiated and has no data', () => {
      [FETCH_STATUS.NOT_INITIATED, FETCH_STATUS.LOADING].forEach((status) => {
        const { queryAllByTestId } = render(
          <ChartContainer height={100} status={status} hasData={false}>
            <div>My amazing component</div>
          </ChartContainer>
        );

        expect(queryAllByTestId('loading')[0]).toBeInTheDocument();
      });
    });
    it('does not show loading when status equals to Loading or Pending and has data', () => {
      [FETCH_STATUS.NOT_INITIATED, FETCH_STATUS.LOADING].forEach((status) => {
        const { queryAllByText } = render(
          <ChartContainer height={100} status={status} hasData={true}>
            <div>My amazing component</div>
          </ChartContainer>
        );
        expect(queryAllByText('My amazing component')[0]).toBeInTheDocument();
      });
    });
  });

  describe('failure indicator', () => {
    it('shows failure message when status equals to Failure and has data', () => {
      const { getByText } = render(
        <ChartContainer
          height={100}
          status={FETCH_STATUS.FAILURE}
          hasData={true}
        >
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(
        getByText(
          'An error happened when trying to fetch data. Please try again'
        )
      ).toBeInTheDocument();
    });
    it('shows failure message when status equals to Failure and has no data', () => {
      const { getByText } = render(
        <ChartContainer
          height={100}
          status={FETCH_STATUS.FAILURE}
          hasData={false}
        >
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

  describe('render component', () => {
    it('shows children component when status Success and has data', () => {
      const { getByText } = render(
        <ChartContainer
          height={100}
          status={FETCH_STATUS.SUCCESS}
          hasData={true}
        >
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(getByText('My amazing component')).toBeInTheDocument();
    });
    it('shows children component when status Success and has no data', () => {
      const { getByText } = render(
        <ChartContainer
          height={100}
          status={FETCH_STATUS.SUCCESS}
          hasData={false}
        >
          <div>My amazing component</div>
        </ChartContainer>
      );
      expect(getByText('My amazing component')).toBeInTheDocument();
    });
  });
});
