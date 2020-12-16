/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, render } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import { merge } from 'lodash';
// import { renderWithTheme } from '../../../../utils/testHelpers';
import React, { ReactNode } from 'react';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { ServiceIcons } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const addWarning = jest.fn();
const httpGet = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = (merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet }, notifications: { toasts: { addWarning } } },
  }) as unknown) as ApmPluginContextValue;

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
          <ServiceIcons serviceName="foo" />
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
          <ServiceIcons serviceName="foo" />
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
          <ServiceIcons serviceName="foo" />
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
          <ServiceIcons serviceName="foo" />
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
          <ServiceIcons serviceName="foo" />
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
    });
  });

  describe('details', () => {
    const callApmApi = (apisMockData: Record<string, object>) => ({
      endpoint,
    }: {
      endpoint: string;
    }) => {
      return apisMockData[endpoint];
    };
    it('Shows loading spinner while fetching data', () => {
      const apisMockData = {
        'GET /api/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /api/apm/services/{serviceName}/metadata/details': {
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
          <ServiceIcons serviceName="foo" />
        </Wrapper>
      );
      expect(queryAllByTestId('loading')).toHaveLength(0);
      expect(getByTestId('service')).toBeInTheDocument();
      expect(getByTestId('container')).toBeInTheDocument();
      expect(getByTestId('cloud')).toBeInTheDocument();
      fireEvent.click(getByTestId('popover_Service'));
      expect(getByTestId('loading-content')).toBeInTheDocument();
    });

    it('shows service content', () => {
      const apisMockData = {
        'GET /api/apm/services/{serviceName}/metadata/icons': {
          data: {
            agentName: 'java',
            containerType: 'Kubernetes',
            cloudProvider: 'gcp',
          },
          status: fetcherHook.FETCH_STATUS.SUCCESS,
          refetch: jest.fn(),
        },
        'GET /api/apm/services/{serviceName}/metadata/details': {
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
          <ServiceIcons serviceName="foo" />
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
  });
});
