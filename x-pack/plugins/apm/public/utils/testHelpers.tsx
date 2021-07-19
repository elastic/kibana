/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* global jest */

import { render, waitFor } from '@testing-library/react';
import { mount, MountRendererProps, ReactWrapper } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import { Location } from 'history';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../src/core/types/elasticsearch';
import { PromiseReturnType } from '../../../observability/typings/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { APMConfig } from '../../server';
import { UxUIFilters } from '../../typings/ui_filters';
import { MockApmPluginContextWrapper } from '../context/apm_plugin/mock_apm_plugin_context';
import { UrlParamsProvider } from '../context/url_params_context/url_params_context';

const originalConsoleWarn = console.warn; // eslint-disable-line no-console
/**
 *  A dependency we're using is using deprecated react methods. Override the
 * console to hide the warnings. These should go away when we switch to
 * Elastic Charts
 */
export function disableConsoleWarning(messageToDisable: string) {
  return jest.spyOn(console, 'warn').mockImplementation((message) => {
    if (!message.startsWith(messageToDisable)) {
      originalConsoleWarn(message);
    }
  });
}

export function toJson(wrapper: ReactWrapper) {
  return enzymeToJson(wrapper, {
    noKey: true,
    mode: 'deep',
  });
}

export function mockMoment() {
  // avoid timezone issues
  jest
    .spyOn(moment.prototype, 'format')
    .mockImplementation(function (this: Moment) {
      return `1st of January (mocking ${this.unix()})`;
    });

  // convert relative time to absolute time to avoid timing issues
  jest
    .spyOn(moment.prototype, 'fromNow')
    .mockImplementation(function (this: Moment) {
      return `1337 minutes ago (mocking ${this.unix()})`;
    });
}

// Useful for getting the rendered href from any kind of link component
export async function getRenderedHref(Component: React.FC, location: Location) {
  const el = render(
    <MemoryRouter initialEntries={[location]}>
      <MockApmPluginContextWrapper>
        <UrlParamsProvider>
          <Component />
        </UrlParamsProvider>
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
  const a = el.container.querySelector('a');

  await waitFor(() => {}, { container: a! });

  return a ? a.getAttribute('href') : '';
}

export function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function expectTextsNotInDocument(output: any, texts: string[]) {
  texts.forEach((text) => {
    try {
      output.getByText(text);
    } catch (err) {
      if (err.message.startsWith('Unable to find an element with the text:')) {
        return;
      } else {
        throw err;
      }
    }

    throw new Error(`Unexpected text found: ${text}`);
  });
}

export function expectTextsInDocument(output: any, texts: string[]) {
  texts.forEach((text) => {
    expect(output.getByText(text)).toBeInTheDocument();
  });
}

interface MockSetup {
  start: number;
  end: number;
  apmEventClient: any;
  internalClient: any;
  config: APMConfig;
  uiFilters: UxUIFilters;
  indices: {
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.sourcemapIndices': string;
    'apm_oss.errorIndices': string;
    'apm_oss.onboardingIndices': string;
    'apm_oss.spanIndices': string;
    'apm_oss.transactionIndices': string;
    'apm_oss.metricsIndices': string;
    /* eslint-enable @typescript-eslint/naming-convention */
    apmAgentConfigurationIndex: string;
    apmCustomLinkIndex: string;
  };
}

interface Options {
  mockResponse?: (
    request: ESSearchRequest
  ) => ESSearchResponse<unknown, ESSearchRequest>;
}

export async function inspectSearchParams(
  fn: (mockSetup: MockSetup) => Promise<any>,
  options: Options = {}
) {
  const spy = jest.fn().mockImplementation(async (request) => {
    return options.mockResponse
      ? options.mockResponse(request)
      : {
          hits: {
            hits: {
              total: {
                value: 0,
              },
            },
          },
        };
  });

  let response;
  let error;

  const mockSetup = {
    start: 1528113600000,
    end: 1528977600000,
    apmEventClient: { search: spy } as any,
    internalClient: { search: spy } as any,
    config: new Proxy(
      {},
      {
        get: (_, key) => {
          switch (key) {
            default:
              return 'myIndex';

            case 'xpack.apm.metricsInterval':
              return 30;
          }
        },
      }
    ) as APMConfig,
    uiFilters: {},
    indices: {
      /* eslint-disable @typescript-eslint/naming-convention */
      'apm_oss.sourcemapIndices': 'myIndex',
      'apm_oss.errorIndices': 'myIndex',
      'apm_oss.onboardingIndices': 'myIndex',
      'apm_oss.spanIndices': 'myIndex',
      'apm_oss.transactionIndices': 'myIndex',
      'apm_oss.metricsIndices': 'myIndex',
      /* eslint-enable @typescript-eslint/naming-convention */
      apmAgentConfigurationIndex: 'myIndex',
      apmCustomLinkIndex: 'myIndex',
    },
    dynamicIndexPattern: null as any,
  };
  try {
    response = await fn(mockSetup);
  } catch (err) {
    error = err;
    // we're only extracting the search params
  }

  return {
    params: spy.mock.calls[0][0],
    response,
    error,
    spy,
    teardown: () => spy.mockClear(),
  };
}

export type SearchParamsMock = PromiseReturnType<typeof inspectSearchParams>;

export function renderWithTheme(
  component: React.ReactNode,
  params?: any,
  { darkMode = false } = {}
) {
  return render(
    <EuiThemeProvider darkMode={darkMode}>{component}</EuiThemeProvider>,
    params
  );
}

export function mountWithTheme(
  tree: React.ReactElement<any>,
  { darkMode = false } = {}
) {
  function WrappingThemeProvider(props: any) {
    return (
      <EuiThemeProvider darkMode={darkMode}>{props.children}</EuiThemeProvider>
    );
  }

  return mount(tree, {
    wrappingComponent: WrappingThemeProvider,
  } as MountRendererProps);
}
