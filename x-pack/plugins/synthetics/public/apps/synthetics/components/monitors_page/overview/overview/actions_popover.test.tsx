/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render } from '../../../../utils/testing/rtl_helpers';
import { ActionsPopover } from './actions_popover';
import * as editMonitorLocatorModule from '../../../../hooks/use_edit_monitor_locator';
import * as monitorDetailLocatorModule from '../../../../hooks/use_monitor_detail_locator';
import * as monitorEnableHandlerModule from '../../../../hooks/use_monitor_enable_handler';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { MonitorOverviewItem } from '../types';

describe('ActionsPopover', () => {
  let testMonitor: MonitorOverviewItem;

  beforeEach(() => {
    testMonitor = {
      location: {
        id: 'us_central',
        isServiceManaged: true,
      },
      isEnabled: true,
      isStatusAlertEnabled: true,
      name: 'Monitor 1',
      id: 'somelongstring',
      configId: '1lkjelre',
      type: 'browser',
      tags: [],
      schedule: '120',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the popover button', () => {
    const { queryByText, getByLabelText } = render(
      <ActionsPopover
        position="relative"
        isPopoverOpen={false}
        setIsPopoverOpen={jest.fn()}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    expect(getByLabelText('Open actions menu'));
    expect(queryByText('Actions')).not.toBeInTheDocument();
  });

  it('opens the popover on click', async () => {
    const setIsPopoverOpen = jest.fn();
    const isPopoverOpen = false;
    const { getByLabelText } = render(
      <ActionsPopover
        position="relative"
        isPopoverOpen={isPopoverOpen}
        setIsPopoverOpen={setIsPopoverOpen}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    const popoverButton = getByLabelText('Open actions menu');
    fireEvent.click(popoverButton);
    expect(setIsPopoverOpen).toHaveBeenCalled();
    // the popover passes back a function that accepts a bool and returns the inverse,
    // so we're calling it here just to make sure the behavior is correct
    expect(setIsPopoverOpen.mock.calls[0][0](isPopoverOpen)).toBe(true);
  });

  it('closes the popover on subsequent click', async () => {
    const setIsPopoverOpen = jest.fn();
    const isPopoverOpen = true;
    const { getByLabelText } = render(
      <ActionsPopover
        position="relative"
        isPopoverOpen={isPopoverOpen}
        setIsPopoverOpen={setIsPopoverOpen}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    const popoverButton = getByLabelText('Open actions menu');
    fireEvent.click(popoverButton);
    expect(setIsPopoverOpen).toHaveBeenCalled();
    // the popover passes back a function that accepts a bool and returns the inverse,
    // so we're calling it here just to make sure the behavior is correct
    expect(setIsPopoverOpen.mock.calls[0][0](isPopoverOpen)).toBe(false);
  });

  it('contains link to edit page', async () => {
    jest
      .spyOn(editMonitorLocatorModule, 'useEditMonitorLocator')
      .mockReturnValue('/a/test/edit/url');
    const { getByRole } = render(
      <ActionsPopover
        position="relative"
        isPopoverOpen={true}
        setIsPopoverOpen={jest.fn()}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    expect(getByRole('link')?.getAttribute('href')).toBe('/a/test/edit/url');
  });

  it('contains link to detail page', async () => {
    jest
      .spyOn(monitorDetailLocatorModule, 'useMonitorDetailLocator')
      .mockReturnValue('/a/test/detail/url');
    const { getByRole } = render(
      <ActionsPopover
        position="relative"
        isPopoverOpen={true}
        setIsPopoverOpen={jest.fn()}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    expect(getByRole('link')?.getAttribute('href')).toBe('/a/test/detail/url');
  });

  it('sets the enabled state', async () => {
    const updateMonitorEnabledState = jest.fn();
    jest.spyOn(monitorEnableHandlerModule, 'useMonitorEnableHandler').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      isEnabled: true,
      updateMonitorEnabledState,
    });
    const { getByText } = render(
      <ActionsPopover
        isPopoverOpen={true}
        position="relative"
        setIsPopoverOpen={jest.fn()}
        monitor={testMonitor}
        locationId={testMonitor.location.id}
      />
    );
    const enableButton = getByText('Disable monitor (all locations)');
    fireEvent.click(enableButton);
    expect(updateMonitorEnabledState).toHaveBeenCalledTimes(1);
    expect(updateMonitorEnabledState.mock.calls[0]).toEqual([false]);
  });

  it('sets enabled state to true', async () => {
    const updateMonitorEnabledState = jest.fn();
    jest.spyOn(monitorEnableHandlerModule, 'useMonitorEnableHandler').mockReturnValue({
      status: FETCH_STATUS.PENDING,
      isEnabled: null,
      updateMonitorEnabledState,
    });
    const { getByText } = render(
      <ActionsPopover
        isPopoverOpen={true}
        setIsPopoverOpen={jest.fn()}
        monitor={{ ...testMonitor, isEnabled: false }}
        position="relative"
        locationId={testMonitor.location.id}
      />
    );
    const enableButton = getByText('Enable monitor (all locations)');
    fireEvent.click(enableButton);
    expect(updateMonitorEnabledState).toHaveBeenCalledTimes(1);
    expect(updateMonitorEnabledState.mock.calls[0]).toEqual([true]);
  });
});
