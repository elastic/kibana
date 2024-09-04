/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import React, { ReactNode } from 'react';
import { ServerlessType } from '../../../../../common/serverless';
import { APIEndpoint } from '../../../../../server';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as useApmServiceContext from '../../../../context/apm_service/use_apm_service_context';
import { ServiceEntitySummary } from '../../../../context/apm_service/use_service_entity_summary_fetcher';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { fromQuery } from '../../../shared/links/url_helpers';
import { isInfraTabHidden, isMetricsTabHidden, useTabs } from './use_tabs';

jest.mock('../../../../hooks/use_profiling_integration_setting', () => ({
  useProfilingIntegrationSetting: () => true,
}));

jest.mock('../../../alerting/utils/get_alerting_capabilities', () => ({
  getAlertingCapabilities: () => ({ isAlertingAvailable: true, canReadAlerts: true }),
}));

const KibanaReactContext = createKibanaReactContext({
  settings: { client: { get: () => {} } },
} as unknown as Partial<CoreStart>);

function wrapper({ children }: { children?: ReactNode }) {
  const history = createMemoryHistory();
  history.replace({
    pathname: '/services/foo/overview',
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
        {children}
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('APM service template', () => {
  describe('isMetricsTabHidden', () => {
    describe('hides metrics tab', () => {
      [
        { agentName: undefined },
        { agentName: 'js-base' },
        { agentName: 'rum-js' },
        { agentName: 'opentelemetry/webjs' },
        { serverlessType: ServerlessType.AWS_LAMBDA },
        { serverlessType: ServerlessType.AZURE_FUNCTIONS },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows metrics tab', () => {
      [
        { agentName: 'ruby', runtimeName: 'ruby' },
        { agentName: 'ruby' },
        { agentName: 'dotnet' },
        { agentName: 'go' },
        { agentName: 'nodejs' },
        { agentName: 'php' },
        { agentName: 'python' },
        { agentName: 'ruby', runtimeName: 'jruby' },
        { agentName: 'java' },
        { agentName: 'opentelemetry/java' },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isMetricsTabHidden(input)).toBeFalsy();
        });
      });
    });
  });
  describe('isInfraTabHidden', () => {
    describe('hides infra tab', () => {
      [
        { agentName: undefined, isInfraTabAvailable: true },
        { agentName: 'js-base', isInfraTabAvailable: true },
        { agentName: 'rum-js', isInfraTabAvailable: true },
        { agentName: 'opentelemetry/webjs', isInfraTabAvailable: true },
        {
          serverlessType: ServerlessType.AWS_LAMBDA,
          isInfraTabAvailable: true,
        },
        {
          serverlessType: ServerlessType.AZURE_FUNCTIONS,
          isInfraTabAvailable: true,
        },
        { agentName: 'nodejs', isInfraTabAvailable: false },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeTruthy();
        });
      });
    });
    describe('shows infra tab', () => {
      [
        { agentName: 'ruby', runtimeName: 'ruby', isInfraTabAvailable: true },
        { agentName: 'ruby', runtimeName: 'jruby', isInfraTabAvailable: true },
        { agentName: 'ruby', isInfraTabAvailable: true },
        { agentName: 'dotnet', isInfraTabAvailable: true },
        { agentName: 'go', isInfraTabAvailable: true },
        { agentName: 'nodejs', isInfraTabAvailable: true },
        { agentName: 'php', isInfraTabAvailable: true },
        { agentName: 'python', isInfraTabAvailable: true },
        { agentName: 'java', isInfraTabAvailable: true },
        { agentName: 'opentelemetry/java', isInfraTabAvailable: true },
      ].map((input) => {
        it(`when input ${JSON.stringify(input)}`, () => {
          expect(isInfraTabHidden(input)).toBeFalsy();
        });
      });
    });
  });

  describe('useTabs order', () => {
    const standardTabOrder = [
      'Overview',
      'Transactions',
      'Dependencies',
      'Errors',
      'Metrics',
      'Infrastructure',
      'Service Map',
      'Logs',
      'Alerts',
      'Universal Profiling',
      'Dashboards',
    ];
    const apisMockData: Partial<Record<APIEndpoint, object>> = {
      'GET /internal/apm/services/{serviceName}/alerts_count': {
        data: {
          alertsCount: 1,
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      },
    };

    beforeEach(() => {
      const callApmApi = () => (endpoint: APIEndpoint) => {
        return apisMockData[endpoint];
      };
      jest.spyOn(fetcherHook, 'useFetcher').mockImplementation((func: Function, deps: string[]) => {
        return func(callApmApi()) || {};
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('APM signal only', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'java',
          serviceName: 'foo',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummary: {
            signalTypes: ['metrics'],
          } as unknown as ServiceEntitySummary,
        });
      });

      it('keeps standard tab order', () => {
        const { result } = renderHook(() => useTabs({ selectedTab: 'overview' }), {
          wrapper,
        });
        expect(result.current.map((tab) => tab.label)).toEqual(standardTabOrder);
      });
    });

    describe('APM and Logs signals', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'java',
          serviceName: 'foo',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummary: {
            signalTypes: ['metrics', 'logs'],
          } as unknown as ServiceEntitySummary,
        });
      });

      it('keeps standard tab order', () => {
        const { result } = renderHook(() => useTabs({ selectedTab: 'overview' }), {
          wrapper,
        });
        expect(result.current.map((tab) => tab.label)).toEqual(standardTabOrder);
      });
    });

    describe('Non-Entity service', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'java',
          serviceName: 'foo',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
        });
      });

      it('keeps standard tab order', () => {
        const { result } = renderHook(() => useTabs({ selectedTab: 'overview' }), {
          wrapper,
        });
        expect(result.current.map((tab) => tab.label)).toEqual(standardTabOrder);
      });
    });

    describe('Logs signal only', () => {
      beforeEach(() => {
        jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
          agentName: 'java',
          serviceName: 'foo',
          transactionTypeStatus: FETCH_STATUS.SUCCESS,
          transactionTypes: [],
          fallbackToTransactions: true,
          serviceAgentStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummaryStatus: FETCH_STATUS.SUCCESS,
          serviceEntitySummary: {
            signalTypes: ['logs'],
          } as unknown as ServiceEntitySummary,
        });
      });

      it('Reorders Logs and Dashboard tabs', () => {
        const { result } = renderHook(() => useTabs({ selectedTab: 'overview' }), {
          wrapper,
        });
        expect(result.current.map((tab) => tab.label)).toEqual([
          'Overview',
          'Logs',
          'Dashboards',
          'Transactions',
          'Dependencies',
          'Errors',
          'Metrics',
          'Infrastructure',
          'Service Map',
          'Alerts',
          'Universal Profiling',
        ]);
      });
    });
  });
});
