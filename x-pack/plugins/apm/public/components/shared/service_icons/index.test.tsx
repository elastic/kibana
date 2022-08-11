/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import { CoreStart } from '@kbn/core/public';
import { merge } from 'lodash';
// import { renderWithTheme } from '../../../../utils/test_helpers';
import React, { ReactNode } from 'react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as fetcherHook from '../../../hooks/use_fetcher';
import { ServiceIcons } from '.';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const addWarning = jest.fn();
const httpGet = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet }, notifications: { toasts: { addWarning } } },
  }) as unknown as ApmPluginContextValue;

  return (
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper value={mockPluginContext}>
        <MockUrlParamsContextProvider
          params={{
            rangeFrom: 'now-15m',
            rangeTo: 'now',
            start: 'mystart',
            end: 'myend',
          }}
        >
          {children}
        </MockUrlParamsContextProvider>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('ServiceIcons', () => {
  describe('icons', () => {
    it('Shows loading spinner while fetching data', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: undefined,
        status: fetcherHook.FETCH_STATUS.LOADING,
        refetch: jest.fn(),
      });
      const { getByTestId, queryAllByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(getByTestId('loading')).toBeInTheDocument();
      expect(queryAllByTestId('service')).toHaveLength(0);
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it("doesn't show any icons", () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {},
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(queryAllByTestId('service')).toHaveLength(0);
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it('shows service icon', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(queryAllByTestId('container')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
    });
    it('shows service and container icons', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
          containerType: 'Kubernetes',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(queryAllByTestId('cloud')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
    });
    it('shows service, container and cloud icons', () => {
      jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
        data: {
          agentName: 'java',
          containerType: 'Kubernetes',
          cloudProvider: 'gcp',
        },
        status: fetcherHook.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
    });
  });

  describe('details', () => {
    const callApmApi =
      (apisMockData: Record<string, object>) => (endpoint: string) => {
        return apisMockData[endpoint];
      };
    it('Shows loading spinner while fetching data', () => {
      const apisMockData = {
        'GET /internal/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            serverlessType: 'lambda',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /internal/apm/services/{serviceName}/metadata/details': {
          data: undefined,
          status: fetcherHook.FETCH_STATUS.LOADING,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('serverless')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
      fireEvent.click(getByTestId('popover_Service'));
      expect(getByTestId('loading-content')).toBeInTheDocument();
    });

    it('shows service content', () => {
      const apisMockData = {
        'GET /internal/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            serverlessType: '',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /internal/apm/services/{serviceName}/metadata/details': {
          data: { service: { versions: ['v1.0.0'] } },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId, getByText } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();

      fireEvent.click(getByTestId('popover_Service'));
      expect(queryAllByTestId('loading-content')).toHaveLength(0);
      expect(getByText('Service')).toBeInTheDocument();
      expect(getByText('v1.0.0')).toBeInTheDocument();
    });

    it('shows serverless content', () => {
      const apisMockData = {
        'GET /internal/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            serverlessType: 'lambda',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /internal/apm/services/{serviceName}/metadata/details': {
          data: {
            serverless: {
              type: '',
              functionNames: ['lambda-java-dev'],
              faasTriggerTypes: ['datasource', 'http'],
            },
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId, getByText } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('serverless')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();

      fireEvent.click(getByTestId('popover_Serverless'));
      expect(queryAllByTestId('loading-content')).toHaveLength(0);
      expect(getByText('Serverless')).toBeInTheDocument();
      expect(getByText('lambda-java-dev')).toBeInTheDocument();
      expect(getByText('datasource')).toBeInTheDocument();
      expect(getByText('http')).toBeInTheDocument();
    });

    it('shows cloud content', () => {
      const apisMockData = {
        'GET /internal/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            serverlessType: 'lambda',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /internal/apm/services/{serviceName}/metadata/details': {
          data: {
            cloud: {
              provider: 'aws',
              projectName: '',
              serviceName: 'lambda',
              availabilityZones: [],
              regions: ['us-east-1'],
              machineTypes: [],
            },
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
      };
      jest
        .spyOn(fetcherHook, 'useFetcher')
        .mockImplementation((func: Function, deps: string[]) => {
          return func(callApmApi(apisMockData)) || {};
        });

      const { queryAllByTestId, getByTestId, getByText } = render(
        <Wrapper>
          <EuiThemeProvider>
            <ServiceIcons
              serviceName="foo"
              start="2021-08-20T10:00:00.000Z"
              end="2021-08-20T10:15:00.000Z"
            />
          </EuiThemeProvider>
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('serverless')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();

      fireEvent.click(getByTestId('popover_Cloud'));
      expect(queryAllByTestId('loading-content')).toHaveLength(0);
      expect(getByText('Cloud')).toBeInTheDocument();
      expect(getByText('aws')).toBeInTheDocument();
      expect(getByText('lambda')).toBeInTheDocument();
      expect(getByText('us-east-1')).toBeInTheDocument();
    });
  });
});
