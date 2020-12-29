/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import {
  TransactionOverviewLink,
  useTransactionsOverviewHref,
} from './transaction_overview_link';

const history = createMemoryHistory();

function wrapper({ queryParams }: { queryParams?: Record<string, unknown> }) {
  return ({ children }: { children: React.ReactElement }) => (
    <MockApmPluginContextWrapper>
      <Router history={history}>
        <MockUrlParamsContextProvider params={queryParams}>
          {children}
        </MockUrlParamsContextProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );
}

describe('Transactions overview link', () => {
  describe('useTransactionsOverviewHref', () => {
    it('returns transaction link', () => {
      const { result } = renderHook(() => useTransactionsOverviewHref('foo'), {
        wrapper: wrapper({}),
      });
      expect(result.current).toEqual(
        '/basepath/app/apm/services/foo/transactions'
      );
    });

    it('returns transaction link with persisted query items', () => {
      const { result } = renderHook(() => useTransactionsOverviewHref('foo'), {
        wrapper: wrapper({ queryParams: { latencyAggregationType: 'avg' } }),
      });
      expect(result.current).toEqual(
        '/basepath/app/apm/services/foo/transactions?latencyAggregationType=avg'
      );
    });
  });
  describe('TransactionOverviewLink', () => {
    function getHref(container: HTMLElement) {
      return ((container as HTMLDivElement).children[0] as HTMLAnchorElement)
        .href;
    }
    it('returns transaction link', () => {
      const Component = wrapper({});
      const { container } = render(
        <Component>
          <TransactionOverviewLink serviceName="foo">
            Service name
          </TransactionOverviewLink>
        </Component>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions'
      );
    });

    it('returns transaction link with persisted query items', () => {
      const Component = wrapper({
        queryParams: { latencyAggregationType: 'avg' },
      });
      const { container } = render(
        <Component>
          <TransactionOverviewLink serviceName="foo">
            Service name
          </TransactionOverviewLink>
        </Component>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions?latencyAggregationType=avg'
      );
    });
  });
});
