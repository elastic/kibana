/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useAlertResponseActionsSupport } from '../../../common/hooks/endpoint/use_alert_response_actions_support';
import type {
  EndpointCapabilities,
  ResponseActionAgentType,
} from '../../../../common/endpoint/service/response_actions/constants';
import { useGetEndpointDetails, useWithShowResponder } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from './translations';

export interface ResponderContextMenuItemProps {
  onClick?: () => void;
  eventData?: TimelineEventsDetailsItem[] | null;
  // FIXME:PT cleanup
  // endpointId: string;
  // agentType: ResponseActionAgentType;
}

interface ResponderActionData {
  handleResponseActionsClick: () => void;
  isDisabled: boolean;
  tooltip: ReactNode;
}

// FIXME:PT cleanup

// const getThirdPartyAgentInfo = (
//   eventData: TimelineEventsDetailsItem[] | null
// ): ThirdPartyAgentInfo => {
//   return {
//     agent: {
//       id: getSentinelOneAgentId(eventData) || '',
//       type: getFieldValue(
//         { category: 'event', field: 'event.module' },
//         eventData
//       ) as ResponseActionAgentType,
//     },
//     host: {
//       name: getFieldValue({ category: 'host', field: 'host.name' }, eventData),
//       os: {
//         name: getFieldValue({ category: 'host', field: 'host.os.name' }, eventData),
//         family: getFieldValue({ category: 'host', field: 'host.os.family' }, eventData),
//         version: getFieldValue({ category: 'host', field: 'host.os.version' }, eventData),
//       },
//     },
//     lastCheckin: getFieldValue(
//       { category: 'kibana', field: 'kibana.alert.last_detected' },
//       eventData
//     ),
//   };
// };

/**
 * This hook is used to get the data needed to show the context menu items for the responder
 * actions using Alert data.
 * @param onClick the callback to handle the click event
 * @param eventData the event data, exists only when agentType !== 'endpoint'
 * @returns an object with the data needed to show the context menu item
 */
export const useWithResponderActionDataFromAlert = ({
  eventData = [],
  onClick,
}: ResponderContextMenuItemProps): ResponderActionData => {
  const {
    isSupported: hostSupportsResponseActions,
    details: { agentType, agentId, platform, hostName },
  } = useAlertResponseActionsSupport(eventData);
  const showResponseActionsConsole = useWithShowResponder();
  const isEndpointHost = agentType === 'endpoint';

  const {
    data: endpointHostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(agentId, {
    enabled: Boolean(hostSupportsResponseActions && isEndpointHost),
  });

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    if (!hostSupportsResponseActions) {
      return [true, NOT_FROM_ENDPOINT_HOST_TOOLTIP];
    }

    // Checks applicable only for Endpoint hosts
    if (isEndpointHost) {
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
        endpointHostInfo?.host_status === HostStatus.UNENROLLED
      ) {
        return [true, HOST_ENDPOINT_UNENROLLED_TOOLTIP];
      }

      // return general error tooltip
      if (error) {
        return [true, METADATA_API_ERROR_TOOLTIP];
      }
    }
    return [false, undefined];
  }, [
    hostSupportsResponseActions,
    isEndpointHost,
    isFetching,
    error,
    endpointHostInfo?.host_status,
  ]);

  const handleResponseActionsClick = useCallback(() => {
    showResponseActionsConsole({
      agentId,
      agentType,
      hostName,
      platform,
      capabilities: isEndpointHost
        ? (endpointHostInfo?.metadata.Endpoint.capabilities as EndpointCapabilities[]) ?? []
        : [],
    });

    // FIXME:PT cleanup

    // if (!isEndpointHost) {
    // }
    // if (isEndpointHost && endpointHostInfo) {
    //   showResponseActionsConsole({
    //     agentId,
    //     agentType,
    //     capabilities:
    //       (endpointHostInfo.metadata.Endpoint.capabilities as EndpointCapabilities[]) ?? [],
    //     hostName: endpointHostInfo.metadata.host.name,
    //     platform: endpointHostInfo.metadata.host.os.name.toLowerCase(),
    //   });
    // }

    if (onClick) {
      onClick();
    }
  }, [
    showResponseActionsConsole,
    agentId,
    agentType,
    isEndpointHost,
    endpointHostInfo?.metadata.Endpoint.capabilities,
    hostName,
    platform,
    onClick,
  ]);

  return {
    handleResponseActionsClick,
    isDisabled,
    tooltip,
  };
};

type ResponderDataForEndpointHost = Omit<ResponderActionData, 'handleResponseActionsClick'> & {
  capabilities: EndpointCapabilities[];
  hostName: string;
  platform: string;
};

/**
 * Hook to specifically gather up the responder data for Elastic Defend endpoints
 * @param endpointAgentId
 * @param enabled
 */
const useResponderDataForEndpointHost = (
  endpointAgentId: string,
  enabled: boolean = true
): ResponderDataForEndpointHost => {
  const {
    data: endpointHostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(endpointAgentId, {
    enabled,
  });

  return useMemo<ResponderDataForEndpointHost>(() => {
    const response: ResponderDataForEndpointHost = {
      isDisabled: false,
      tooltip: undefined,
      capabilities: [],
      hostName: '',
      platform: '',
    };

    if (!enabled) {
      response.isDisabled = true;
      return response;
    }

    if (isFetching) {
      response.isDisabled = true;
      response.tooltip = LOADING_ENDPOINT_DATA_TOOLTIP;
      return response;
    }

    // if we got an error, and it's a 404, it means the endpoint is not from the endpoint host
    if (error && error.body?.statusCode === 404) {
      response.isDisabled = true;
      response.tooltip = NOT_FROM_ENDPOINT_HOST_TOOLTIP;
      return response;
    }

    // if we got an error and,
    // it's a 400 with unenrolled in the error message (alerts can exist for endpoint that are no longer around)
    // or,
    // the Host status is `unenrolled`
    if (
      (error && error.body?.statusCode === 400 && error.body?.message.includes('unenrolled')) ||
      endpointHostInfo?.host_status === HostStatus.UNENROLLED
    ) {
      response.isDisabled = true;
      response.tooltip = HOST_ENDPOINT_UNENROLLED_TOOLTIP;
      return response;
    }

    // return general error tooltip
    if (error) {
      response.isDisabled = true;
      response.tooltip = METADATA_API_ERROR_TOOLTIP;
    }

    response.capabilities = (endpointHostInfo?.metadata.Endpoint.capabilities ??
      []) as EndpointCapabilities[];
    response.hostName = endpointHostInfo?.metadata.host.name ?? '';
    response.platform = endpointHostInfo?.metadata.host.os.name.toLowerCase() ?? '';

    return response;
  }, [
    enabled,
    isFetching,
    error,
    endpointHostInfo?.host_status,
    endpointHostInfo?.metadata.Endpoint.capabilities,
    endpointHostInfo?.metadata.host.name,
    endpointHostInfo?.metadata.host.os.name,
  ]);
};

export const useResponderActionData = ({
  onClick,
  agentId,
  agentType,
}: {
  agentId: string;
  agentType: ResponseActionAgentType;
  onClick?: () => void;
}): ResponderActionData => {
  const isEndpointHost = agentType === 'endpoint';

  const showResponseActionsConsole = useWithShowResponder();
  const { tooltip, isDisabled, capabilities, hostName, platform } = useResponderDataForEndpointHost(
    agentId,
    isEndpointHost
  );

  // TODO:PT add support for other agent types once we add the `Respond` button to the Host details page in SIEM

  const handleResponseActionsClick = useCallback(() => {
    showResponseActionsConsole({
      agentId,
      agentType,
      hostName,
      platform,
      capabilities: isEndpointHost ? capabilities : [],
    });

    if (onClick) {
      onClick();
    }
  }, [
    agentType,
    capabilities,
    agentId,
    hostName,
    isEndpointHost,
    onClick,
    platform,
    showResponseActionsConsole,
  ]);

  return useMemo(() => {
    return {
      isDisabled: isEndpointHost ? isDisabled : true,
      tooltip: isEndpointHost ? tooltip : NOT_FROM_ENDPOINT_HOST_TOOLTIP,
      handleResponseActionsClick,
    };
  }, [handleResponseActionsClick, isDisabled, isEndpointHost, tooltip]);
};
