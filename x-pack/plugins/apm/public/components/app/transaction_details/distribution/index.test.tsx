/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n/react';
import { render, screen, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { EuiThemeProvider } from 'src/plugins/kibana_react/common';
import { MockApmAppContextProvider } from '../../../../context/mock_apm_app/mock_apm_app_context';
import * as useFetcherModule from '../../../../hooks/use_fetcher';
import { getFormattedSelection, TransactionDistribution } from './';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <MockApmAppContextProvider
          value={{
            path: '/services/the-service-name/transactions/view?transactionName=the-transaction-name&rangeFrom=now-15m&rangeTo=now',
          }}
        >
          {children}
        </MockApmAppContextProvider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('transaction_details/distribution', () => {
  describe('getFormattedSelection', () => {
    it('displays only one unit if from and to share the same unit', () => {
      expect(getFormattedSelection([10000, 100000])).toEqual('10 - 100 ms');
    });

    it('displays two units when from and to have different units', () => {
      expect(getFormattedSelection([100000, 1000000000])).toEqual(
        '100 ms - 17 min'
      );
    });
  });

  describe('TransactionDistribution', () => {
    it('shows loading indicator when the service is running and returned no results yet', async () => {
      jest.spyOn(useFetcherModule, 'useFetcher').mockImplementation(() => ({
        data: {},
        refetch: () => {},
        status: useFetcherModule.FETCH_STATUS.LOADING,
      }));

      render(
        <TransactionDistribution
          onChartSelection={jest.fn()}
          onClearSelection={jest.fn()}
          traceSamples={[]}
        />,

        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });
    });

    it("doesn't show loading indicator when the service isn't running", async () => {
      jest.spyOn(useFetcherModule, 'useFetcher').mockImplementation(() => ({
        data: { percentileThresholdValue: 1234, overallHistogram: [] },
        refetch: () => {},
        status: useFetcherModule.FETCH_STATUS.SUCCESS,
      }));

      render(
        <Wrapper>
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamples={[]}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).toBeNull(); // it doesn't exist
      });
    });
  });
});
