/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fireEvent,
  getByText,
  queryByLabelText,
  render,
} from '@testing-library/react';
import { omit } from 'lodash';
import React from 'react';
import { Router } from 'react-router-dom';
import { TransactionOverview } from './';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { UrlParamsProvider } from '../../../context/UrlParamsContext';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import * as useFetcherHook from '../../../hooks/useFetcher';
import * as useServiceTransactionTypesHook from '../../../hooks/useServiceTransactionTypes';
import { history } from '../../../utils/history';
import { fromQuery } from '../../shared/Links/url_helpers';

jest.spyOn(history, 'push');
jest.spyOn(history, 'replace');

jest.mock('ui/new_platform');
function setup({
  urlParams,
  serviceTransactionTypes,
}: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  const defaultLocation = {
    pathname: '/services/foo/transactions',
    search: fromQuery(omit(urlParams, 'serviceName')),
  } as any;

  history.replace({
    ...defaultLocation,
  });

  jest
    .spyOn(useServiceTransactionTypesHook, 'useServiceTransactionTypes')
    .mockReturnValue(serviceTransactionTypes);

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  return render(
    <MockApmPluginContextWrapper>
      <Router history={history}>
        <UrlParamsProvider>
          <TransactionOverview />
        </UrlParamsProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );
}

describe('TransactionOverview', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when no transaction type is given', () => {
    it('should redirect to first type', () => {
      setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName',
        },
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
          serviceName: 'MyServiceName',
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
          serviceName: 'MyServiceName',
        },
      });

      expect(history.location.search).toEqual('?transactionType=secondType');
      expect(getByText(container, 'firstType')).toBeInTheDocument();
      expect(getByText(container, 'secondType')).toBeInTheDocument();

      fireEvent.click(getByText(container, 'firstType'));

      expect(history.push).toHaveBeenCalled();
      expect(history.location.search).toEqual('?transactionType=firstType');
    });
  });

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('does not render a radio group with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
          serviceName: 'MyServiceName',
        },
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
