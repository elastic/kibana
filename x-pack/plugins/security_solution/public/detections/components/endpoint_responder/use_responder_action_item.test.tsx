/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useResponderActionItem } from './use_responder_action_item';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { isTimelineEventItemAnAlert } from '../../../common/utils/endpoint_alert_check';
import { getFieldValue } from '../host_isolation/helpers';
import { isAlertFromCrowdstrikeEvent } from '../../../common/utils/crowdstrike_alert_check';
import { isAlertFromSentinelOneEvent } from '../../../common/utils/sentinelone_alert_check';
import { useResponderActionData } from './use_responder_action_data';

jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/utils/endpoint_alert_check');
jest.mock('../host_isolation/helpers');
jest.mock('../../../common/utils/crowdstrike_alert_check');
jest.mock('../../../common/utils/sentinelone_alert_check');
jest.mock('./use_responder_action_data');

describe('useResponderActionItem', () => {
  const mockUseUserPrivileges = useUserPrivileges as jest.Mock;
  const mockIsTimelineEventItemAnAlert = isTimelineEventItemAnAlert as jest.Mock;
  const mockGetFieldValue = getFieldValue as jest.Mock;
  const mockIsAlertFromCrowdstrikeEvent = isAlertFromCrowdstrikeEvent as jest.Mock;
  const mockIsAlertFromSentinelOneEvent = isAlertFromSentinelOneEvent as jest.Mock;
  const mockUseResponderActionData = useResponderActionData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseResponderActionData.mockImplementation(() => ({
      handleResponseActionsClick: jest.fn(),
      isDisabled: false,
      tooltip: 'Tooltip text',
    }));
  });

  it('should return an empty array if user privileges are loading', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: true,
        canAccessResponseConsole: false,
      },
    });

    const { result } = renderHook(() => useResponderActionItem(null, jest.fn()));
    expect(result.current).toEqual([]);
  });

  it('should return an empty array if user cannot access response console', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: false,
      },
    });

    const { result } = renderHook(() => useResponderActionItem(null, jest.fn()));
    expect(result.current).toEqual([]);
  });

  it('should return an empty array if the event is not an alert', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: true,
      },
    });
    mockIsTimelineEventItemAnAlert.mockReturnValue(false);

    const { result } = renderHook(() => useResponderActionItem(null, jest.fn()));
    expect(result.current).toEqual([]);
  });

  it('should return the response action item if all conditions are met for a generic endpoint', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: true,
      },
    });
    mockIsTimelineEventItemAnAlert.mockReturnValue(true);
    mockGetFieldValue.mockReturnValue('endpoint-id');
    mockIsAlertFromCrowdstrikeEvent.mockReturnValue(false);
    mockIsAlertFromSentinelOneEvent.mockReturnValue(false);

    renderHook(() => useResponderActionItem([], jest.fn()));

    expect(mockUseResponderActionData).toHaveBeenCalledWith({
      agentType: 'endpoint',
      endpointId: 'endpoint-id',
      eventData: null,
      onClick: expect.any(Function),
    });
  });

  it('should return the response action item if all conditions are met for a Crowdstrike event', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: true,
      },
    });
    mockIsTimelineEventItemAnAlert.mockReturnValue(true);
    mockGetFieldValue.mockReturnValue('crowdstrike-id');
    mockIsAlertFromCrowdstrikeEvent.mockReturnValue(true);
    mockIsAlertFromSentinelOneEvent.mockReturnValue(false);

    renderHook(() => useResponderActionItem([], jest.fn()));

    expect(mockUseResponderActionData).toHaveBeenCalledWith({
      agentType: 'crowdstrike',
      endpointId: 'crowdstrike-id',
      eventData: [],
      onClick: expect.any(Function),
    });
  });

  it('should return the response action item if all conditions are met for a SentinelOne event', () => {
    mockUseUserPrivileges.mockReturnValue({
      endpointPrivileges: {
        loading: false,
        canAccessResponseConsole: true,
      },
    });

    mockIsTimelineEventItemAnAlert.mockReturnValue(true);
    mockGetFieldValue.mockReturnValue('sentinelone-id');
    mockIsAlertFromCrowdstrikeEvent.mockReturnValue(false);
    mockIsAlertFromSentinelOneEvent.mockReturnValue(true);

    renderHook(() => useResponderActionItem([], jest.fn()));

    expect(mockUseResponderActionData).toHaveBeenCalledWith({
      agentType: 'sentinel_one',
      endpointId: 'sentinelone-id',
      eventData: [],
      onClick: expect.any(Function),
    });
  });
});
