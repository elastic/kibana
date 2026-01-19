/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as useApmServiceContext from '../../../context/apm_service/use_apm_service_context';
import * as useApmDataViewHook from '../../../hooks/use_adhoc_apm_data_view';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { fromQuery } from '../../shared/links/url_helpers';
import { Metrics } from '.';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/public';

const KibanaReactContext = createKibanaReactContext({
  settings: { client: { get: () => {} } },
} as unknown as Partial<CoreStart>);

function MetricsWithWrapper() {
  jest.spyOn(useApmDataViewHook, 'useAdHocApmDataView').mockReturnValue({
    dataView: { id: 'id-1', name: 'apm-data-view' } as DataView,
    apmIndices: { metric: 'metrics*' } as APMIndices,
  });

  const history = createMemoryHistory();
  history.replace({
    pathname: '/services/testServiceName/metrics',
    search: fromQuery({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    }),
  });

  return (
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper
        history={history}
        value={mockApmPluginContextValue as unknown as ApmPluginContextValue}
      >
        <Metrics />
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('Metrics', () => {
  describe('render the correct metrics content for', () => {
    describe('APM agent / server service', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'java',
          serviceName: 'testServiceName',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          indexSettings: [
            {
              configurationName: 'span',
              defaultValue: 'traces-*',
              savedValue: 'traces-*, apm-*',
            },
          ],
          indexSettingsStatus: FETCH_STATUS.SUCCESS,
        });
      });

      it('shows java dashboard content', () => {
        const result = render(<MetricsWithWrapper />);
        // Check that the other content is not rendered as we don't have test id in the dashboard rendering component
        const loadingBar = result.queryByRole('progressbar');
        expect(loadingBar).toBeNull();
        expect(result.queryByTestId('apmMetricsNoDashboardFound')).toBeNull();
        expect(result.queryByTestId('apmAddApmCallout')).toBeNull();
      });
    });

    describe('APM agent / EDOT sdk with dashboard', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'opentelemetry/nodejs/elastic',
          serviceName: 'testServiceName',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          indexSettings: [
            {
              configurationName: 'span',
              defaultValue: 'traces-*',
              savedValue: 'traces-*, apm-*',
            },
          ],
          indexSettingsStatus: FETCH_STATUS.SUCCESS,
        });
      });

      it('shows nodejs dashboard content', () => {
        const result = render(<MetricsWithWrapper />);
        // Check that the other content is not rendered as we don't have test id in the dashboard rendering component
        const loadingBar = result.queryByRole('progressbar');
        expect(loadingBar).toBeNull();
        expect(result.queryByTestId('apmMetricsNoDashboardFound')).toBeNull();
        expect(result.queryByTestId('apmAddApmCallout')).toBeNull();
      });
    });

    describe('APM agent / otel sdk with no dashboard', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'opentelemetry/erlang',
          serviceName: 'testServiceName',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          indexSettings: [
            {
              configurationName: 'span',
              defaultValue: 'traces-*',
              savedValue: 'traces-*, apm-*',
            },
          ],
          indexSettingsStatus: FETCH_STATUS.SUCCESS,
        });
      });

      it('shows "no dashboard found" message', () => {
        const result = render(<MetricsWithWrapper />);
        const apmMetricsNoDashboardFound = result.getByTestId('apmMetricsNoDashboardFound');
        expect(apmMetricsNoDashboardFound).toBeInTheDocument();
      });
    });
  });
});
