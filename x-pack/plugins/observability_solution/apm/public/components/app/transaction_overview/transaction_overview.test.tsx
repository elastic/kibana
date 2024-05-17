/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { queryByLabelText } from '@testing-library/react';
import { MemoryHistory, createMemoryHistory } from 'history';
import React from 'react';
import { TransactionOverview } from '.';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import * as useServiceAgentNameHook from '../../../context/apm_service/use_service_agent_fetcher';
import * as useServiceTransactionTypesHook from '../../../context/apm_service/use_service_transaction_types_fetcher';
import { MockTimeRangeContextProvider } from '../../../context/time_range_metadata/mock_time_range_metadata_context_provider';
import { ApmTimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import type { ApmUrlParams } from '../../../context/url_params_context/types';
import { UrlParamsProvider } from '../../../context/url_params_context/url_params_context';
import * as useFetcherHook from '../../../hooks/use_fetcher';
import { disableConsoleWarning, renderWithTheme } from '../../../utils/test_helpers';
import { fromQuery } from '../../shared/links/url_helpers';

const KibanaReactContext = createKibanaReactContext({
  uiSettings: { get: () => true },
  usageCollection: { reportUiCounter: () => {} },
} as unknown as Partial<CoreStart>);

let history: MemoryHistory<unknown>;

function setup({
  urlParams,
  serviceTransactionTypes,
}: {
  urlParams: ApmUrlParams;
  serviceTransactionTypes: string[];
}) {
  history = createMemoryHistory();
  jest.spyOn(history, 'push');
  jest.spyOn(history, 'replace');

  history.replace({
    pathname: '/services/foo/transactions',
    search: fromQuery(urlParams),
  });

  // mock transaction types
  jest.spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypesFetcher').mockReturnValue({
    transactionTypes: serviceTransactionTypes,
    status: useFetcherHook.FETCH_STATUS.SUCCESS,
  });

  // mock agent
  jest.spyOn(useServiceAgentNameHook, 'useServiceAgentFetcher').mockReturnValue({
    agentName: 'nodejs',
    runtimeName: 'node',
    serverlessType: undefined,
    error: undefined,
    status: useFetcherHook.FETCH_STATUS.SUCCESS,
  });

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  return renderWithTheme(
    <IntlProvider locale="en">
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper history={history}>
          <UrlParamsProvider>
            <MockTimeRangeContextProvider>
              <ApmTimeRangeMetadataContextProvider>
                <ApmServiceContextProvider>
                  <TransactionOverview />
                </ApmServiceContextProvider>
              </ApmTimeRangeMetadataContextProvider>
            </MockTimeRangeContextProvider>
          </UrlParamsProvider>
        </MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
    </IntlProvider>
  );
}

describe('TransactionOverview', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    consoleMock = disableConsoleWarning('Warning: componentWillReceiveProps');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no transaction type is given in urlParams', () => {
    it('should redirect to first type', () => {
      setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'rangeFrom=now-15m&rangeTo=now&transactionType=firstType',
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Transaction type';

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('does not render a radio group with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        },
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
