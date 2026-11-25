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
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import * as fetcherHook from '../../../../hooks/use_fetcher';
import { useServiceIconBadges } from './use_service_icon_badges';

jest.mock('@kbn/react-kibana-context-theme', () => ({
  useKibanaIsDarkMode: () => false,
}));

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
} as Partial<CoreStart>);

function Wrapper({ children }: { children?: ReactNode }) {
  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: jest.fn() } },
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

function ServiceIconBadgesFixture(props: {
  serviceName: string;
  environment: string;
  start: string;
  end: string;
}) {
  const badges = useServiceIconBadges(props);
  return (
    <>
      {badges.map((badge) => (
        <div key={badge.label} data-test-subj={`badge-${badge.label}`}>
          {badge.renderCustomBadge?.({ badgeText: badge.label })}
        </div>
      ))}
    </>
  );
}

const defaultProps = {
  serviceName: 'foo',
  environment: 'dev',
  start: '2021-08-20T10:00:00.000Z',
  end: '2021-08-20T10:15:00.000Z',
};

describe('useServiceIconBadges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading badge while icons are fetching', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: undefined,
      status: fetcherHook.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadgesFixture {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('service')).not.toBeInTheDocument();
  });

  it('renders no icon badges when metadata has no icons', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {},
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadgesFixture {...defaultProps} />
      </Wrapper>
    );

    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('service')).not.toBeInTheDocument();
    expect(screen.queryByTestId('container')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cloud')).not.toBeInTheDocument();
  });

  it('renders service, container, and cloud icon badges when present', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {
        agentName: 'java',
        containerType: 'Kubernetes',
        cloudProvider: 'aws',
      },
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadgesFixture {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('service')).toBeInTheDocument();
    expect(screen.getByTestId('container')).toBeInTheDocument();
    expect(screen.getByTestId('cloud')).toBeInTheDocument();
  });

  it('renders an OpenTelemetry badge for OTel agents', () => {
    jest.spyOn(fetcherHook, 'useFetcher').mockReturnValue({
      data: {
        agentName: 'opentelemetry/java',
      },
      status: fetcherHook.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    render(
      <Wrapper>
        <ServiceIconBadgesFixture {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByTestId('service')).toBeInTheDocument();
    expect(screen.getByTestId('opentelemetry')).toBeInTheDocument();
  });
});
