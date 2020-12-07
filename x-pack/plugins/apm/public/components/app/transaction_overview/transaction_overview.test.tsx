/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, getByText, queryByLabelText } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { CoreStart } from 'kibana/public';
import React from 'react';
import { Router } from 'react-router-dom';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { ApmServiceContextProvider } from '../../../context/apm_service/apm_service_context';
import { UrlParamsProvider } from '../../../context/url_params_context/url_params_context';
import { IUrlParams } from '../../../context/url_params_context/types';
import * as useFetcherHook from '../../../hooks/use_fetcher';
import * as useServiceTransactionTypesHook from '../../../context/apm_service/use_service_transaction_types_fetcher';
import * as useServiceAgentNameHook from '../../../context/apm_service/use_service_agent_name_fetcher';
import {
  disableConsoleWarning,
  renderWithTheme,
} from '../../../utils/testHelpers';
import { fromQuery } from '../../shared/Links/url_helpers';
import { TransactionOverview } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const history = createMemoryHistory();
jest.spyOn(history, 'push');
jest.spyOn(history, 'replace');

function setup({
  urlParams,
  serviceTransactionTypes,
}: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  history.replace({
    pathname: '/services/foo/transactions',
    search: fromQuery(urlParams),
  });

  // mock transaction types
  jest
    .spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypesFetcher')
    .mockReturnValue(serviceTransactionTypes);

  // mock agent
  jest
    .spyOn(useServiceAgentNameHook, 'useServiceAgentNameFetcher')
    .mockReturnValue({
      agentName: 'nodejs',
      error: undefined,
      status: useFetcherHook.FETCH_STATUS.SUCCESS,
    });

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  return renderWithTheme(
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper>
        <Router history={history}>
          <UrlParamsProvider>
            <ApmServiceContextProvider>
              <TransactionOverview serviceName="opbeans-python" />
            </ApmServiceContextProvider>
          </UrlParamsProvider>
        </Router>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
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
        urlParams: {},
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'transactionType=firstType',
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Transaction type';

  describe('when transactionType is selected and multiple transaction types are given', () => {
    it('renders a radio group with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
        },
      });

      expect(getByText(container, 'firstType')).toBeInTheDocument();
      expect(getByText(container, 'secondType')).toBeInTheDocument();

      expect(getByText(container, 'firstType')).not.toBeNull();
    });

    it('should update the URL when a transaction type is selected', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
        },
      });

      expect(history.location.search).toEqual(
        '?transactionType=secondType&rangeFrom=now-15m&rangeTo=now'
      );
      expect(getByText(container, 'firstType')).toBeInTheDocument();
      expect(getByText(container, 'secondType')).toBeInTheDocument();

      fireEvent.click(getByText(container, 'firstType'));

      expect(history.push).toHaveBeenCalled();
      expect(history.location.search).toEqual(
        '?transactionType=firstType&rangeFrom=now-15m&rangeTo=now'
      );
    });
  });

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('does not render a radio group with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
        },
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
