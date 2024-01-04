/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { SentinelOneAgentInfo } from '../../../../common/types';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import {
  useGetEndpointDetails,
  useWithShowEndpointResponder,
  useWithShowResponder,
} from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';
import {
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
} from './translations';
import { getFieldValue } from '../host_isolation/helpers';

export interface ResponderContextMenuItemProps {
  endpointId: string;
  onClick?: () => void;
  thirdPartyAgentInfo?: {
    agentType: ResponseActionAgentType;
    eventData: TimelineEventsDetailsItem[] | null;
  };
}

const getSentinelOneAgentInfo = (
  eventData: TimelineEventsDetailsItem[] | null
): SentinelOneAgentInfo => {
  return {
    agent: {
      id: getFieldValue({ category: 'agent', field: 'agent.id' }, eventData),
      type: getFieldValue({ category: 'event', field: 'event.module' }, eventData),
    },
    host: {
      name: getFieldValue({ category: 'host', field: 'host.os.name' }, eventData),
    },
    os: {
      name: getFieldValue({ category: 'host', field: 'host.os.name' }, eventData),
      family: getFieldValue({ category: 'host', field: 'host.os.family' }, eventData),
      version: getFieldValue({ category: 'host', field: 'host.os.version' }, eventData),
    },
    last_checkin: getFieldValue(
      { category: 'kibana', field: 'kibana.alert.last_detected' },
      eventData
    ),
  };
};

export const useResponderActionData = ({
  endpointId,
  onClick,
  thirdPartyAgentInfo,
}: ResponderContextMenuItemProps): {
  handleResponseActionsClick: () => void;
  isDisabled: boolean;
  tooltip: ReactNode;
} => {
  const { agentType, eventData } = thirdPartyAgentInfo ?? {};
  const isEndpointHost = agentType === 'endpoint';
  const showEndpointActionsConsole = useWithShowEndpointResponder();
  const showResponseActionsConsole = useWithShowResponder();

  const {
    data: hostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(endpointId, { enabled: Boolean(endpointId) });

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    if (!isEndpointHost) {
      return [false, undefined];
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
  }, [isEndpointHost, isFetching, error, hostInfo?.host_status]);

  const handleResponseActionsClick = useCallback(() => {
    if (eventData) {
      const agentInfoFromAlert = getSentinelOneAgentInfo(eventData);
      showResponseActionsConsole(agentInfoFromAlert);
    }
    if (hostInfo) {
      showEndpointActionsConsole(hostInfo.metadata);
    }
    if (onClick) onClick();
  }, [eventData, hostInfo, onClick, showResponseActionsConsole, showEndpointActionsConsole]);

  return {
    handleResponseActionsClick,
    isDisabled,
    tooltip,
  };
};
