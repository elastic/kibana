/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MonitorPageTitle } from '../monitor_title';
import { renderWithRouter, MountWithReduxProvider } from '../../../lib';
import { AppState, store } from '../../../state';

describe('MonitorTitle component', () => {
  const monitorName = 'sample monitor';
  const initialState = store.getState();
  const state: AppState = {
    ...initialState,
    monitorStatus: {
      loading: false,
      status: {
        docId: '',
        timestamp: '',
        monitor: {
          duration: { us: 0 },
          id: '',
          status: '',
          type: '',
          ...initialState?.monitorStatus?.status,
          name: monitorName,
        },
      },
    },
  };

  it('renders the monitor heading and EnableMonitorAlert toggle', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider store={state}>
        <MonitorPageTitle />
      </MountWithReduxProvider>
    );
    expect(component.find('h1').text()).toBe(monitorName);
    expect(component.find('[data-test-subj="uptimeDisplayDefineConnector"]').length).toBe(1);
  });
});
