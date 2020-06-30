/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import React from 'react';
import { ReactWrapper, mount, MountRendererProps } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import { Location } from 'history';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import { render, waitForElement } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { APMConfig } from '../../server';
import { LocationProvider } from '../context/LocationContext';
import { PromiseReturnType } from '../../typings/common';
import { EuiThemeProvider } from '../../../observability/public';
import {
  ESFilter,
  ESSearchResponse,
  ESSearchRequest,
} from '../../typings/elasticsearch';
import { MockApmPluginContextWrapper } from '../context/ApmPluginContext/MockApmPluginContext';

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
    <MockApmPluginContextWrapper>
      <MemoryRouter initialEntries={[location]}>
        <LocationProvider>
          <Component />
        </LocationProvider>
      </MemoryRouter>
    </MockApmPluginContextWrapper>
  );

  await waitForElement(() => el.container.querySelector('a'));

  const a = el.container.querySelector('a');
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
  dynamicIndexPattern: any;
  start: number;
  end: number;
  client: any;
  internalClient: any;
  config: APMConfig;
  uiFiltersES: ESFilter[];
  indices: {
    'apm_oss.sourcemapIndices': string;
    'apm_oss.errorIndices': string;
    'apm_oss.onboardingIndices': string;
    'apm_oss.spanIndices': string;
    'apm_oss.transactionIndices': string;
    'apm_oss.metricsIndices': string;
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
    client: { search: spy } as any,
    internalClient: { search: spy } as any,
    config: new Proxy({}, { get: () => 'myIndex' }) as APMConfig,
    uiFiltersES: [{ term: { 'my.custom.ui.filter': 'foo-bar' } }],
    indices: {
      'apm_oss.sourcemapIndices': 'myIndex',
      'apm_oss.errorIndices': 'myIndex',
      'apm_oss.onboardingIndices': 'myIndex',
      'apm_oss.spanIndices': 'myIndex',
      'apm_oss.transactionIndices': 'myIndex',
      'apm_oss.metricsIndices': 'myIndex',
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
  const WrappingThemeProvider = (props: any) => (
    <EuiThemeProvider darkMode={darkMode}>{props.children}</EuiThemeProvider>
  );

  return mount(tree, {
    wrappingComponent: WrappingThemeProvider,
  } as MountRendererProps);
}
