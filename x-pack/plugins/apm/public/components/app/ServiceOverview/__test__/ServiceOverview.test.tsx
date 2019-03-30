/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, wait, waitForElement } from 'react-testing-library';
import 'react-testing-library/cleanup-after-each';
import * as apmRestServices from 'x-pack/plugins/apm/public/services/rest/apm/services';
// @ts-ignore
import configureStore from 'x-pack/plugins/apm/public/store/config/configureStore';
import * as statusCheck from '../../../../services/rest/apm/status_check';
import { ServiceOverview } from '../view';

function Comp() {
  const store = configureStore();

  return (
    <Provider store={store}>
      <ServiceOverview urlParams={{}} />
    </Provider>
  );
}

describe('Service Overview -> View', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  // Suppress warnings about "act" until async/await syntax is supported: https://github.com/facebook/react/issues/14769
  /* tslint:disable:no-console */
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('should render services, when list is not empty', async () => {
    // mock rest requests
    const spy1 = jest
      .spyOn(statusCheck, 'loadAgentStatus')
      .mockResolvedValue(true);
    const spy2 = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue([
        {
          serviceName: 'My Python Service',
          agentName: 'python',
          transactionsPerMinute: 100,
          errorsPerMinute: 200,
          avgResponseTime: 300
        },
        {
          serviceName: 'My Go Service',
          agentName: 'go',
          transactionsPerMinute: 400,
          errorsPerMinute: 500,
          avgResponseTime: 600
        }
      ]);

    const { container, getByText } = render(<Comp />);

    // wait for requests to be made
    await wait(
      () =>
        expect(spy1).toHaveBeenCalledTimes(1) &&
        expect(spy2).toHaveBeenCalledTimes(1)
    );

    await waitForElement(() => getByText('My Python Service'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render getting started message, when list is empty and no historical data is found', async () => {
    // mock rest requests
    const spy1 = jest
      .spyOn(statusCheck, 'loadAgentStatus')
      .mockResolvedValue(false);

    const spy2 = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue([]);

    const { container, getByText } = render(<Comp />);

    // wait for requests to be made
    await wait(
      () =>
        expect(spy1).toHaveBeenCalledTimes(1) &&
        expect(spy2).toHaveBeenCalledTimes(1)
    );

    // wait for elements to be rendered
    await waitForElement(() =>
      getByText(
        "Looks like you don't have any APM services installed. Let's add some!"
      )
    );

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });

  it('should render empty message, when list is empty and historical data is found', async () => {
    // mock rest requests
    const spy1 = jest
      .spyOn(statusCheck, 'loadAgentStatus')
      .mockResolvedValue(true);
    const spy2 = jest
      .spyOn(apmRestServices, 'loadServiceList')
      .mockResolvedValue([]);

    const { container, getByText } = render(<Comp />);

    // wait for requests to be made
    await wait(
      () =>
        expect(spy1).toHaveBeenCalledTimes(1) &&
        expect(spy2).toHaveBeenCalledTimes(1)
    );

    // wait for elements to be rendered
    await waitForElement(() => getByText('No services found'));

    expect(container.querySelectorAll('.euiTableRow')).toMatchSnapshot();
  });
});
