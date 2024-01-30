/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* global jest */

// eslint-disable-next-line import/no-extraneous-dependencies
import { render, waitFor } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { mount, MountRendererProps, ReactWrapper } from 'enzyme';
// eslint-disable-next-line import/no-extraneous-dependencies
import enzymeToJson from 'enzyme-to-json';
import { Location } from 'history';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
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
  const mockSpaces = {
    getActiveSpace: jest.fn().mockImplementation(() => ({ id: 'mockSpaceId' })),
  };

  const el = render(
    <MemoryRouter initialEntries={[location]}>
      <MockApmPluginContextWrapper>
        <KibanaContextProvider services={{ spaces: mockSpaces }}>
          <UrlParamsProvider>
            <Component />
          </UrlParamsProvider>
        </KibanaContextProvider>
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );

  await waitFor(() => el.container.querySelector('a') !== null, {
    container: el.container,
  });

  return el.container.querySelector('a')?.getAttribute('href');
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
