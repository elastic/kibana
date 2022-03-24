/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getByTestId, fireEvent, getByText } from '@testing-library/react';
import { createMemoryHistory, MemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { MockApmPluginContextWrapper } from '../../context/apm_plugin/mock_apm_plugin_context';
import { ApmServiceContextProvider } from '../../context/apm_service/apm_service_context';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import type { ApmUrlParams } from '../../context/url_params_context/types';
import * as useFetcherHook from '../../hooks/use_fetcher';
import * as useServiceTransactionTypesHook from '../../context/apm_service/use_service_transaction_types_fetcher';
import { renderWithTheme } from '../../utils/test_helpers';
import { fromQuery } from './links/url_helpers';
import { CoreStart } from 'kibana/public';
import { SearchBar } from './search_bar';

function setup({
  urlParams,
  serviceTransactionTypes,
  history,
}: {
  urlParams: ApmUrlParams;
  serviceTransactionTypes: string[];
  history: MemoryHistory;
}) {
  history.replace({
    pathname: '/services/foo/transactions',
    search: fromQuery(urlParams),
  });

  const KibanaReactContext = createKibanaReactContext({
    usageCollection: { reportUiCounter: () => {} },
  } as Partial<CoreStart>);

  // mock transaction types
  jest
    .spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypesFetcher')
    .mockReturnValue(serviceTransactionTypes);

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  return renderWithTheme(
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper>
        <Router history={history}>
          <UrlParamsProvider>
            <ApmServiceContextProvider>
              <SearchBar showTransactionTypeSelector />
            </ApmServiceContextProvider>
          </UrlParamsProvider>
        </Router>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('when transactionType is selected and multiple transaction types are given', () => {
  let history: MemoryHistory;
  beforeEach(() => {
    history = createMemoryHistory();
    jest.spyOn(history, 'push');
    jest.spyOn(history, 'replace');
  });

  it('renders a radio group with transaction types', () => {
    const { container } = setup({
      history,
      serviceTransactionTypes: ['firstType', 'secondType'],
      urlParams: {
        transactionType: 'secondType',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    // transaction type selector
    const dropdown = getByTestId(container, 'headerFilterTransactionType');

    // both options should be listed
    expect(getByText(dropdown, 'firstType')).toBeInTheDocument();
    expect(getByText(dropdown, 'secondType')).toBeInTheDocument();

    // second option should be selected
    expect(dropdown).toHaveValue('secondType');
  });

  it('should update the URL when a transaction type is selected', () => {
    const { container } = setup({
      history,
      serviceTransactionTypes: ['firstType', 'secondType'],
      urlParams: {
        transactionType: 'secondType',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      },
    });

    expect(history.location.search).toEqual(
      '?transactionType=secondType&rangeFrom=now-15m&rangeTo=now'
    );

    // transaction type selector
    const dropdown = getByTestId(container, 'headerFilterTransactionType');
    expect(getByText(dropdown, 'firstType')).toBeInTheDocument();
    expect(getByText(dropdown, 'secondType')).toBeInTheDocument();

    // change dropdown value
    fireEvent.change(dropdown, { target: { value: 'firstType' } });

    // assert that value was changed
    expect(dropdown).toHaveValue('firstType');
    expect(history.push).toHaveBeenCalled();
    expect(history.location.search).toEqual(
      '?transactionType=firstType&rangeFrom=now-15m&rangeTo=now'
    );
  });
});
