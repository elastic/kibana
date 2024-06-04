/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useResponderActionItem } from './use_responder_action_item';
import { useUserPrivileges } from '../../../user_privileges';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../mock/endpoint';
import { endpointAlertDataMock } from '../../../../mock/endpoint/endpoint_alert_data_mock';

jest.mock('../../../user_privileges');

// FIXME:PT implement tests
// FIXME:PT move the tests under `x-pack/plugins/security_solution/public/detections/components/take_action_dropdown/index.test.tsx` here

describe('useResponderActionItem', () => {
  const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
  let alertDetailItemData: TimelineEventsDetailsItem[];
  let renderHook: AppContextTestRender['renderHook'];

  beforeEach(() => {
    const appContextMock = createAppRootMockRenderer();

    renderHook = appContextMock.renderHook;
    alertDetailItemData = endpointAlertDataMock.generateEndpointAlertDetailsItemData();

    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: { loading: false, canAccessResponseConsole: true },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty array if user privileges are loading', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: { loading: true, canAccessResponseConsole: false },
    });
    const { result } = renderHook(() => useResponderActionItem(alertDetailItemData, jest.fn()));

    expect(result.current).toHaveLength(0);
  });

  it('should return an empty array if user cannot access response console', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: { loading: false, canAccessResponseConsole: false },
    });
    const { result } = renderHook(() => useResponderActionItem(alertDetailItemData, jest.fn()));

    expect(result.current).toHaveLength(0);
  });

  it('should return an empty array if the event is not an alert', () => {
    alertDetailItemData = alertDetailItemData.filter(
      (item) => item.field !== 'kibana.alert.rule.uuid'
    );
    const { result } = renderHook(() => useResponderActionItem(alertDetailItemData, jest.fn()));

    expect(result.current).toHaveLength(0);
  });

  it('should return the response action item if all conditions are met for an Elastic Endpoint', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useResponderActionItem(alertDetailItemData, jest.fn())
    );
    await waitForNextUpdate();
    const menuItem = result.current.at(0)!;

    expect(menuItem).not.toBeUndefined();
    expect(menuItem.disabled).toBe(false);
    expect(menuItem.toolTipContent).toEqual('Loading');
  });

  it('should return the response action item if all conditions are met for a Crowdstrike event', () => {
    const { result } = renderHook(() => useResponderActionItem(alertDetailItemData, jest.fn()));

    expect(result.current).toEqual(['one']);
  });

  it('should return the response action item if all conditions are met for a SentinelOne event', () => {
    const { result } = renderHook(() => useResponderActionItem(alertDetailItemData, jest.fn()));

    expect(result.current).toEqual(['one']);
  });
});
