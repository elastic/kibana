/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { Platform } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { getSentinelOneAgentId } from '../../../common/utils/sentinelone_alert_check';
import type { ThirdPartyAgentInfo } from '../../../../common/types';
import type {
  ResponseActionAgentType,
  EndpointCapabilities,
} from '../../../../common/endpoint/service/response_actions/constants';
import { useGetEndpointDetails, useWithShowResponder } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
  SENTINEL_ONE_AGENT_ID_PROPERTY_MISSING,
} from './translations';
import { getFieldValue } from '../host_isolation/helpers';

export interface ResponderContextMenuItemProps {
  endpointId: string;
  onClick?: () => void;
  agentType: ResponseActionAgentType;
  eventData?: TimelineEventsDetailsItem[] | null;
}

const getThirdPartyAgentInfo = (
  eventData: TimelineEventsDetailsItem[] | null
): ThirdPartyAgentInfo => {
  return {
    agent: {
      id: getSentinelOneAgentId(eventData) || '',
      type: getFieldValue(
        { category: 'event', field: 'event.module' },
        eventData
      ) as ResponseActionAgentType,
    },
    host: {
      name: getFieldValue({ category: 'host', field: 'host.name' }, eventData),
      os: {
        name: getFieldValue({ category: 'host', field: 'host.os.name' }, eventData),
        family: getFieldValue({ category: 'host', field: 'host.os.family' }, eventData),
        version: getFieldValue({ category: 'host', field: 'host.os.version' }, eventData),
      },
    },
    lastCheckin: getFieldValue(
      { category: 'kibana', field: 'kibana.alert.last_detected' },
      eventData
    ),
  };
};

/**
 * This hook is used to get the data needed to show the context menu items for the responder
 * actions.
 * @param endpointId the id of the endpoint
 * @param onClick the callback to handle the click event
 * @param agentType the type of agent, defaults to 'endpoint'
 * @param eventData the event data, exists only when agentType !== 'endpoint'
 * @returns an object with the data needed to show the context menu item
 */

export const useResponderActionData = ({
  endpointId,
  onClick,
  agentType,
  eventData,
}: ResponderContextMenuItemProps): {
  handleResponseActionsClick: () => void;
  isDisabled: boolean;
  tooltip: ReactNode;
} => {
  const isEndpointHost = agentType === 'endpoint';
  const showResponseActionsConsole = useWithShowResponder();

  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );
  const {
    data: hostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(endpointId, { enabled: Boolean(endpointId && isEndpointHost) });

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    // v8.13 disabled for third-party agent alerts if the feature flag is not enabled
    if (!isEndpointHost) {
      switch (agentType) {
        case 'sentinel_one':
          // Disable it if feature flag is disabled
          if (!isSentinelOneV1Enabled) {
            return [true, undefined];
          }
          // Event must have the property that identifies the agent id
          if (!getSentinelOneAgentId(eventData ?? null)) {
            return [true, SENTINEL_ONE_AGENT_ID_PROPERTY_MISSING];
          }

          return [false, undefined];

        default:
          return [true, undefined];
      }
    }

    if (!endpointId) {
      return [true, HOST_ENDPOINT_UNENROLLED_TOOLTIP];
    }

    // Still loading host info
    if (isFetching) {
      return [true, LOADING_ENDPOINT_DATA_TOOLTIP];
    }

    // if we got an error, and it's a 404, it means the endpoint is not from the endpoint host
    if (error && error.body?.statusCode === 404) {
      return [true, NOT_FROM_ENDPOINT_HOST_TOOLTIP];
    }

    // if we got an error and,
    // it's a 400 with unenrolled in the error message (alerts can exist for endpoint that are no longer around)
    // or,
    // the Host status is `unenrolled`
    if (
      (error && error.body?.statusCode === 400 && error.body?.message.includes('unenrolled')) ||
      hostInfo?.host_status === HostStatus.UNENROLLED
    ) {
      return [true, HOST_ENDPOINT_UNENROLLED_TOOLTIP];
    }

    // return general error tooltip
    if (error) {
      return [true, METADATA_API_ERROR_TOOLTIP];
    }

    return [false, undefined];
  }, [
    isEndpointHost,
    endpointId,
    isFetching,
    error,
    hostInfo?.host_status,
    agentType,
    isSentinelOneV1Enabled,
    eventData,
  ]);

  const handleResponseActionsClick = useCallback(() => {
    if (!isEndpointHost) {
      const agentInfoFromAlert = getThirdPartyAgentInfo(eventData || null);
      showResponseActionsConsole({
        agentId: agentInfoFromAlert.agent.id,
        agentType,
        capabilities: ['isolation'],
        hostName: agentInfoFromAlert.host.name,
        platform: agentInfoFromAlert.host.os.family,
      });
    }
    if (isEndpointHost && hostInfo) {
      showResponseActionsConsole({
        agentId: hostInfo.metadata.agent.id,
        agentType,
        capabilities: (hostInfo.metadata.Endpoint.capabilities as EndpointCapabilities[]) ?? [],
        hostName: hostInfo.metadata.host.name,
        platform: hostInfo.metadata.host.os.name.toLowerCase() as Platform,
      });
    }
    if (onClick) onClick();
  }, [isEndpointHost, hostInfo, onClick, eventData, showResponseActionsConsole, agentType]);

  return {
    handleResponseActionsClick,
    isDisabled,
    tooltip,
  };
};
