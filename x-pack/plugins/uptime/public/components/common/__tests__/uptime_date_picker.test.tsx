/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { UptimeDatePicker } from '../uptime_date_picker';
import {
  renderWithRouter,
  shallowWithRouter,
  MountWithReduxProvider,
  mountWithRouterRedux,
} from '../../../lib';
import { UptimeStartupPluginsContextProvider } from '../../../contexts';
import { startPlugins } from '../../../lib/__mocks__/uptime_plugin_start_mock';
import { ClientPluginsStart } from '../../../apps/plugin';
import { createMemoryHistory } from 'history';

describe('UptimeDatePicker component', () => {
  it('validates props with shallow render', () => {
    const component = shallowWithRouter(<UptimeDatePicker />);
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithRouter(
      <MountWithReduxProvider>
        <UptimeDatePicker />
      </MountWithReduxProvider>
    );
    expect(component).toMatchSnapshot();
  });

  it('uses shared date range state when there is no url date range state', () => {
    const customHistory = createMemoryHistory();
    jest.spyOn(customHistory, 'push');

    const component = mountWithRouterRedux(
      <UptimeStartupPluginsContextProvider
        {...((startPlugins as unknown) as Partial<ClientPluginsStart>)}
      >
        <UptimeDatePicker />
      </UptimeStartupPluginsContextProvider>,
      { customHistory }
    );

    const startBtn = component.find('[data-test-subj="superDatePickerstartDatePopoverButton"]');

    expect(startBtn.text()).toBe('~ 30 minutes ago');

    const endBtn = component.find('[data-test-subj="superDatePickerendDatePopoverButton"]');

    expect(endBtn.text()).toBe('~ 15 minutes ago');

    expect(customHistory.push).toHaveBeenCalledWith({
      pathname: '/',
      search: 'dateRangeStart=now-30m&dateRangeEnd=now-15m',
    });
  });

  it('should use url date range even if shared date range is present', () => {
    const customHistory = createMemoryHistory({
      initialEntries: ['/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
    });

    jest.spyOn(customHistory, 'push');

    const component = mountWithRouterRedux(
      <UptimeStartupPluginsContextProvider
        {...((startPlugins as unknown) as Partial<ClientPluginsStart>)}
      >
        <UptimeDatePicker />
      </UptimeStartupPluginsContextProvider>,
      { customHistory }
    );

    const showDateBtn = component.find('[data-test-subj="superDatePickerShowDatesButton"]');

    expect(showDateBtn.childAt(0).text()).toBe('Last 10 minutes');

    // it should update shared state

    expect(startPlugins.data.query.timefilter.timefilter.setTime).toHaveBeenCalledWith({
      from: 'now-10m',
      to: 'now',
    });
  });
});
