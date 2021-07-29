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
  ServiceOrTransactionsOverviewLink,
  useServiceOrTransactionsOverviewHref,
} from './service_transactions_overview_link';

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

describe('Service or transactions overview link', () => {
  describe('useServiceOrTransactionsOverviewHref', () => {
    it('returns service link', () => {
      const { result } = renderHook(
        () => useServiceOrTransactionsOverviewHref({ serviceName: 'foo' }),
        { wrapper: wrapper({}) }
      );
      expect(result.current).toEqual('/basepath/app/apm/services/foo');
    });

    it('returns service link with persisted query items', () => {
      const { result } = renderHook(
        () => useServiceOrTransactionsOverviewHref({ serviceName: 'foo' }),
        { wrapper: wrapper({ queryParams: { latencyAggregationType: 'avg' } }) }
      );
      expect(result.current).toEqual(
        '/basepath/app/apm/services/foo?latencyAggregationType=avg'
      );
    });
  });
  describe('ServiceOrTransactionsOverviewLink', () => {
    function getHref(container: HTMLElement) {
      return ((container as HTMLDivElement).children[0] as HTMLAnchorElement)
        .href;
    }
    it('returns service link', () => {
      const Component = wrapper({});
      const { container } = render(
        <Component>
          <ServiceOrTransactionsOverviewLink serviceName="foo">
            Service name
          </ServiceOrTransactionsOverviewLink>
        </Component>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo'
      );
    });

    it('returns service link with persisted query items', () => {
      const Component = wrapper({
        queryParams: { latencyAggregationType: 'avg' },
      });
      const { container } = render(
        <Component>
          <ServiceOrTransactionsOverviewLink serviceName="foo">
            Service name
          </ServiceOrTransactionsOverviewLink>
        </Component>
      );
      expect(getHref(container)).toEqual(
        'http://localhost/basepath/app/apm/services/foo?latencyAggregationType=avg'
      );
    });
  });
});
