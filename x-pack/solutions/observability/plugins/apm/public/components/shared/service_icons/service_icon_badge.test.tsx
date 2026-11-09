/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { merge } from 'lodash';
import type { ReactNode } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../context/url_params_context/mock_url_params_context_provider';
import * as fetcherHook from '../../../hooks/use_fetcher';
import { ServiceIconBadge } from './service_icon_badge';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

const httpGet = jest.fn();

function Wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet } },
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
          <EuiThemeProvider>{children}</EuiThemeProvider>
        </MockUrlParamsContextProvider>
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('ServiceIconBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a popover and loads details when clicked', async () => {
    const user = userEvent.setup();
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {
        service: { agent: { name: 'java' } },
      },
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadge
          iconKey="service"
          iconType="logoJava"
          title="Service"
          serviceName="foo"
          environment="prod"
          start="2021-08-20T10:00:00.000Z"
          end="2021-08-20T10:15:00.000Z"
        />
      </Wrapper>
    );

    expect(screen.getByTestId('service')).toBeInTheDocument();
    await user.click(screen.getByTestId('popover_Service'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Agent name & version')).toBeInTheDocument();
    expect(screen.getByText(/java/)).toBeInTheDocument();
  });

  it('shows a loading skeleton while details are fetching', async () => {
    const user = userEvent.setup();
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadge
          iconKey="cloud"
          iconType="logoAWS"
          title="Cloud"
          serviceName="foo"
          environment="prod"
          start="2021-08-20T10:00:00.000Z"
          end="2021-08-20T10:15:00.000Z"
        />
      </Wrapper>
    );

    await user.click(screen.getByTestId('popover_Cloud'));
    expect(await screen.findByTestId('loading-content')).toBeInTheDocument();
  });
});
