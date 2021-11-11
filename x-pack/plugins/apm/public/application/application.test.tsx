/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { createMemoryHistory } from 'history';
import React from 'react';
import type { AppMountParameters } from 'src/core/public';
import { ConfigSchema } from '..';
import { RumHome } from '../components/app/RumDashboard/RumHome';
import { mockContextValue } from '../context/mock_apm_app/mock_apm_app_context';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { disableConsoleWarning } from '../utils/testHelpers';
import { renderApp as renderApmApp } from './';
import { UXAppRoot } from './uxApp';

jest.mock('../services/rest/data_view', () => ({
  createStaticDataView: () => Promise.resolve(undefined),
}));

jest.mock('../components/app/RumDashboard/RumHome', () => ({
  RumHome: () => <p>Home Mock</p>,
}));

const appMountParameters = {
  element: document.createElement('div'),
  history: createMemoryHistory(),
  setHeaderActionMenu: () => {},
} as unknown as AppMountParameters;

describe('renderApp (APM)', () => {
  let mockConsole: jest.SpyInstance;
  beforeAll(() => {
    // The RUM agent logs an unnecessary message here. There's a couple open
    // issues need to be fixed to get the ability to turn off all of the logging:
    //
    // * https://github.com/elastic/apm-agent-rum-js/issues/799
    // * https://github.com/elastic/apm-agent-rum-js/issues/861
    //
    // for now, override `console.warn` to filter those messages out.
    mockConsole = disableConsoleWarning('[Elastic APM]');
  });

  afterAll(() => {
    mockConsole.mockRestore();
  });

  const getApmMountProps = () => {
    const { coreStart, pluginsSetup, pluginsStart } = mockContextValue;

    jest.spyOn(window, 'scrollTo').mockReturnValueOnce(undefined);
    createCallApmApi(coreStart);

    jest
      .spyOn(window.console, 'warn')
      .mockImplementationOnce((message: string) => {
        if (message.startsWith('[Elastic APM')) {
          return;
        } else {
          console.warn(message); // eslint-disable-line no-console
        }
      });

    return {
      appMountParameters,
      config: {} as ConfigSchema,
      coreStart,
      pluginsSetup,
      pluginsStart,
    };
  };

  it('renders the app', () => {
    const mountProps = getApmMountProps();

    let unmount: () => void;

    act(() => {
      unmount = renderApmApp(mountProps);
    });

    expect(() => {
      unmount();
    }).not.toThrowError();
  });
});

describe('renderUxApp', () => {
  it('has an error boundary for the UXAppRoot', async () => {
    const uxMountProps = { ...mockContextValue, appMountParameters };

    const wrapper = mount(<UXAppRoot {...uxMountProps} />);

    wrapper
      .find(RumHome)
      .simulateError(new Error('Oh no, an unexpected error!'));

    expect(wrapper.find(RumHome)).toHaveLength(0);
    expect(wrapper.find(EuiErrorBoundary)).toHaveLength(1);
    expect(wrapper.find(EuiErrorBoundary).text()).toMatch(
      /Error: Oh no, an unexpected error!/
    );
  });
});
