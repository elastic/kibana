/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreOverTime, scoreFormatter } from '.';
import { TestProviders } from '../../../../common/mock';
import { LineSeries } from '@elastic/charts';

const mockLineSeries = LineSeries as jest.Mock;

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');
  return {
    ...original,
    LineSeries: jest.fn().mockImplementation(() => <></>),
  };
});

describe('Risk Score Over Time', () => {
  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime
          riskScore={[]}
          loading={false}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
          queryId={'test_query_id'}
          title={'test_query_title'}
          toggleStatus={true}
        />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime')).toBeInTheDocument();
  });

  it('renders loader when loading', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime
          loading={true}
          from={'2020-07-07T08:20:18.966Z'}
          to={'2020-07-08T08:20:18.966Z'}
          queryId={'test_query_id'}
          title={'test_query_title'}
          toggleStatus={true}
        />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime-loading')).toBeInTheDocument();
  });

  describe('scoreFormatter', () => {
    it('renders score formatted', () => {
      render(
        <TestProviders>
          <RiskScoreOverTime
            riskScore={[]}
            loading={false}
            from={'2020-07-07T08:20:18.966Z'}
            to={'2020-07-08T08:20:18.966Z'}
            queryId={'test_query_id'}
            title={'test_query_title'}
            toggleStatus={true}
          />
        </TestProviders>
      );

      const tickFormat = mockLineSeries.mock.calls[0][0].tickFormat;

      expect(tickFormat).toBe(scoreFormatter);
    });

    it('renders a formatted score', () => {
      expect(scoreFormatter(3.000001)).toEqual('3');
      expect(scoreFormatter(3.4999)).toEqual('3');
      expect(scoreFormatter(3.51111)).toEqual('4');
      expect(scoreFormatter(3.9999)).toEqual('4');
    });
  });
});
