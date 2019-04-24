/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createHistory from 'history/createHashHistory';
import React from 'react';
import { Router } from 'react-router-dom';
import { queryByLabelText, render } from 'react-testing-library';
import { TransactionOverview } from '..';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';

// Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
/* eslint-disable no-console */
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

function setup(props: {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  const history = createHistory();
  history.replace = jest.fn();

  const { container } = render(
    <Router history={history}>
      <TransactionOverview {...props} />
    </Router>
  );

  return { container, history };
}

describe('TransactionOverviewView', () => {
  describe('when no transaction type is given', () => {
    it('should render null', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName'
        }
      });
      expect(container).toMatchInlineSnapshot(`<div />`);
    });

    it('should redirect to first type', () => {
      const { history } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          serviceName: 'MyServiceName'
        }
      });
      expect(history.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/MyServiceName/transactions/firstType'
        })
      );
    });
  });

  const FILTER_BY_TYPE_LABEL = 'Filter by type';

  describe('when transactionType is selected and multiple transaction types are given', () => {
    it('should render dropdown with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType', 'secondType'],
        urlParams: {
          transactionType: 'secondType',
          serviceName: 'MyServiceName'
        }
      });

      expect(
        queryByLabelText(container, FILTER_BY_TYPE_LABEL)
      ).toMatchSnapshot();
    });
  });

  describe('when a transaction type is selected, and there are no other transaction types', () => {
    it('should not render a dropdown with transaction types', () => {
      const { container } = setup({
        serviceTransactionTypes: ['firstType'],
        urlParams: {
          transactionType: 'firstType',
          serviceName: 'MyServiceName'
        }
      });

      expect(queryByLabelText(container, FILTER_BY_TYPE_LABEL)).toBeNull();
    });
  });
});
