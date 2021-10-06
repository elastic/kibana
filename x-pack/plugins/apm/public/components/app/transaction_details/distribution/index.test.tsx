/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React, { ReactNode } from 'react';
import { of } from 'rxjs';

import { CoreStart } from 'kibana/public';
import { merge } from 'lodash';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import type { IKibanaSearchResponse } from 'src/plugins/data/public';
import { EuiThemeProvider } from 'src/plugins/kibana_react/common';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import type { LatencyCorrelationsRawResponse } from '../../../../../common/search_strategies/latency_correlations/types';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { fromQuery } from '../../../shared/Links/url_helpers';

import { getFormattedSelection, TransactionDistribution } from './index';

function Wrapper({
  children,
  dataSearchResponse,
}: {
  children?: ReactNode;
  dataSearchResponse: IKibanaSearchResponse<LatencyCorrelationsRawResponse>;
}) {
  const mockDataSearch = jest.fn(() => of(dataSearchResponse));

  const dataPluginMockStart = dataPluginMock.createStartContract();
  const KibanaReactContext = createKibanaReactContext({
    data: {
      ...dataPluginMockStart,
      search: {
        ...dataPluginMockStart.search,
        search: mockDataSearch,
      },
    },
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
    <EuiThemeProvider darkMode={false}>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper
          history={history}
          value={mockPluginContext}
        >
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
      render(
        <Wrapper
          dataSearchResponse={{
            isRunning: true,
            rawResponse: {
              ccsWarning: false,
              took: 1234,
              latencyCorrelations: [],
              log: [],
            },
          }}
        >
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamples={[]}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });
    });

    it("doesn't show loading indicator when the service isn't running", async () => {
      render(
        <Wrapper
          dataSearchResponse={{
            isRunning: false,
            rawResponse: {
              ccsWarning: false,
              took: 1234,
              latencyCorrelations: [],
              log: [],
            },
          }}
        >
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
