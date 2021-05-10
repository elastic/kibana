/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

function Wrapper({ children }: { children: React.ReactElement }) {
  return (
    <MockApmPluginContextWrapper>
      <Router history={history}>
        <MockUrlParamsContextProvider>{children}</MockUrlParamsContextProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );
}

describe('Transactions overview link', () => {
  describe('useTransactionsOverviewHref', () => {
    it('returns transaction link', () => {
      const { result } = renderHook(
        () => useTransactionsOverviewHref({ serviceName: 'foo' }),
        { wrapper: Wrapper }
      );
      expect(result.current).toEqual(
        '/basepath/app/apm/services/foo/transactions'
      );
    });

    it('returns transaction link with persisted query items', () => {
      const { result } = renderHook(
        () =>
          useTransactionsOverviewHref({
            serviceName: 'foo',
            latencyAggregationType: 'avg',
          }),
        { wrapper: Wrapper }
      );
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
      const { container } = render(
        <Wrapper>
          <TransactionOverviewLink serviceName="foo">
            Service name
          </TransactionOverviewLink>
        </Wrapper>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions'
      );
    });

    it('returns transaction link with persisted query items', () => {
      const { container } = render(
        <Wrapper>
          <TransactionOverviewLink
            serviceName="foo"
            latencyAggregationType="avg"
          >
            Service name
          </TransactionOverviewLink>
        </Wrapper>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo/transactions?latencyAggregationType=avg'
      );
    });
  });
});
