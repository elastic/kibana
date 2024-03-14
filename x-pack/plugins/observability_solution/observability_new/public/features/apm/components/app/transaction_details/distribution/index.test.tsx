/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React, { ReactNode } from 'react';

import { CoreStart } from '@kbn/core/public';
import { merge } from 'lodash';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as useFetcherModule from '../../../../hooks/use_fetcher';
import { fromQuery } from '../../../shared/links/url_helpers';

import { TransactionDistribution } from '.';

const coreMock = {
  settings: { client: { get: () => {} } },
} as unknown as CoreStart;

function Wrapper({ children }: { children?: ReactNode }) {
  const KibanaReactContext = createKibanaReactContext({
    ...coreMock,
    usageCollection: { reportUiCounter: () => {} },
  } as Partial<CoreStart>);

  const httpGet = jest.fn();

  const history = createMemoryHistory();
  jest.spyOn(history, 'push');
  jest.spyOn(history, 'replace');

  history.replace({
    pathname: '/services/the-service-name/transactions/view',
    search: fromQuery({
      transactionName: 'the-transaction-name',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    }),
  });

  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet } },
  }) as unknown as ApmPluginContextValue;

  return (
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper history={history} value={mockPluginContext}>
            <MockUrlParamsContextProvider
              params={{
                rangeFrom: 'now-15m',
                rangeTo: 'now',
                start: 'mystart',
                end: 'myend',
              }}
            >
              {children}
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('transaction_details/distribution', () => {
  describe('TransactionDistribution', () => {
    it('shows loading indicator when the service is running and returned no results yet', async () => {
      jest.spyOn(useFetcherModule, 'useFetcher').mockImplementation(() => ({
        data: undefined,
        refetch: () => {},
        status: useFetcherModule.FETCH_STATUS.LOADING,
      }));

      render(
        <TransactionDistribution
          onChartSelection={jest.fn()}
          onClearSelection={jest.fn()}
          traceSamplesFetchResult={{
            data: { traceSamples: [] },
            status: useFetcherModule.FETCH_STATUS.LOADING,
            error: undefined,
          }}
        />,

        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });
    });

    it("doesn't show loading indicator when the service isn't running", async () => {
      jest
        .spyOn(useFetcherModule, 'useFetcher')
        .mockImplementationOnce(() => ({
          data: {
            traceItems: {},
            entryTransaction: {},
          },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }))
        .mockImplementationOnce(() => ({
          data: { percentileThresholdValue: 1234, overallHistogram: [] },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }));

      render(
        <Wrapper>
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamplesFetchResult={{
              data: { traceSamples: [] },
              status: useFetcherModule.FETCH_STATUS.LOADING,
              error: undefined,
            }}
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
