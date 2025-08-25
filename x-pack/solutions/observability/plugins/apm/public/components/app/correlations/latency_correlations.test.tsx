/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { ReactNode } from 'react';
import React from 'react';
import { of } from 'rxjs';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import type { CoreStart } from '@kbn/core/public';
import { merge } from 'lodash';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { LatencyCorrelationsResponse } from '../../../../common/correlations/latency_correlations/types';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { fromQuery } from '../../shared/links/url_helpers';

import { LatencyCorrelations } from './latency_correlations';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: {
      apmSourcesAccess: {
        getApmIndexSettings: jest.fn(),
      },
    },
  }),
}));
jest.mock('../../../hooks/use_fetcher', () => {
  const originalUseFetcher = jest.requireActual('../../../hooks/use_fetcher').useFetcher;
  return {
    ...jest.requireActual('../../../hooks/use_fetcher'),
    useFetcher: jest.fn((fn, deps) => {
      // Only mock when used with apmSourcesAccess.getApmIndexSettings
      if (deps && deps[0]?.getApmIndexSettings) {
        return {
          data: {
            apmIndexSettings: [
              {
                configurationName: 'transaction',
                defaultValue: 'traces-*',
              },
              {
                configurationName: 'span',
                savedValue: 'traces-*',
                defaultValue: 'traces-otel-*',
              },
              {
                configurationName: 'test',
                savedValue: 'fake-index',
                defaultValue: 'fake-*',
              },
            ],
          },
        };
      }
      // Use the real useFetcher for other calls
      return originalUseFetcher(fn, deps);
    }),
  };
});

function Wrapper({
  children,
  dataSearchResponse,
}: {
  children?: ReactNode;
  dataSearchResponse: IKibanaSearchResponse<LatencyCorrelationsResponse>;
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
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper history={history} value={mockPluginContext}>
            <MockUrlParamsContextProvider>{children}</MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('correlations', () => {
  describe('LatencyCorrelations', () => {
    it('shows loading indicator when the service is running and returned no results yet', async () => {
      render(
        <Wrapper
          dataSearchResponse={{
            isRunning: true,
            rawResponse: {
              ccsWarning: false,
              latencyCorrelations: [],
            },
          }}
        >
          <LatencyCorrelations onFilter={jest.fn()} />
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
              latencyCorrelations: [],
            },
          }}
        >
          <LatencyCorrelations onFilter={jest.fn()} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).toBeNull(); // it doesn't exist
      });
    });
  });
});
