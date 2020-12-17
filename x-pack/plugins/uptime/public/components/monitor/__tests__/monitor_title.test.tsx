/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as reactRouterDom from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { MonitorPageTitle } from '../monitor_title';
import { renderWithRouter, MountWithReduxProvider } from '../../../lib';
import { AppState, store } from '../../../state';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  // @ts-ignore
  ...jest.requireActual('react-router-dom'),
}));

describe('MonitorTitle component', () => {
  const monitorName = 'sample monitor';
  const monitorId = 'always-down';
  const initialState = store.getState();
  const url = {
    full: 'https://www.elastic.co/',
  };
  const monitorStatus = {
    loading: false,
    status: {
      docId: '',
      timestamp: '',
      monitor: {
        duration: { us: 0 },
        id: monitorId,
        status: '',
        type: '',
        ...initialState?.monitorStatus?.status,
        name: monitorName,
      },
      url,
    },
  };

  const stateWithMonitorName: AppState = {
    ...initialState,
    monitorStatus,
  };

  const stateWithoutMonitorName: AppState = {
    ...initialState,
    monitorStatus: {
      ...monitorStatus,
      status: {
        ...monitorStatus.status,
        monitor: {
          ...monitorStatus.status.monitor,
          name: undefined,
        },
      },
    },
  };

  it('renders the monitor heading and EnableMonitorAlert toggle', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider store={stateWithMonitorName}>
        <MonitorPageTitle />
      </MountWithReduxProvider>
    );
    expect(component.find('h1').text()).toBe(monitorName);
    expect(component.find('[data-test-subj="uptimeDisplayDefineConnector"]').length).toBe(1);
  });

  it('renders the user provided monitorId when the name is not present', () => {
    jest.spyOn(reactRouterDom, 'useParams').mockImplementation(() => ({
      monitorId: 'YWx3YXlzLWRvd24', // resolves to always-down
    }));
    const component = renderWithRouter(
      <MountWithReduxProvider store={stateWithoutMonitorName}>
        <MonitorPageTitle />
      </MountWithReduxProvider>
    );
    expect(component.find('h1').text()).toBe(monitorId);
  });

  it('renders the url when the monitorId is auto generated and the monitor name is not present', () => {
    jest.spyOn(reactRouterDom, 'useParams').mockImplementation(() => ({
      monitorId: 'YXV0by1pY21wLTBYMjQ5NDhGNDY3QzZDNEYwMQ', // resolves to auto-icmp-0X24948F467C6C4F01
    }));

    const history = createMemoryHistory();
    // navigate to monitor page

    const component = renderWithRouter(
      <MountWithReduxProvider store={stateWithoutMonitorName}>
        <MonitorPageTitle />
      </MountWithReduxProvider>,
      history
    );
    expect(component.find('h1').text()).toBe(url.full);
  });
});
