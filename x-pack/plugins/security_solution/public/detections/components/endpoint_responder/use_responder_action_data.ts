/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useGetEndpointDetails, useWithShowEndpointResponder } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';
import {
  NOT_FROM_ENDPOINT_HOST_TOOLTIP,
  LOADING_ENDPOINT_DATA_TOOLTIP,
  HOST_ENDPOINT_UNENROLLED_TOOLTIP,
  METADATA_API_ERROR_TOOLTIP,
} from './translations';

export interface ResponderContextMenuItemProps {
  endpointId: string;
  onClick?: () => void;
}

export const useResponderActionData = ({
  endpointId,
  onClick,
}: ResponderContextMenuItemProps): {
  handleResponseActionsClick: () => void;
  isDisabled: boolean;
  tooltip: ReactNode;
} => {
  const showEndpointResponseActionsConsole = useWithShowEndpointResponder();
  const {
    data: endpointHostInfo,
    isFetching,
    error,
  } = useGetEndpointDetails(endpointId, { enabled: Boolean(endpointId) });

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    if (!endpointId) {
      return [true, NOT_FROM_ENDPOINT_HOST_TOOLTIP];
    }

    // Still loading Endpoint host info
    if (isFetching) {
      return [true, LOADING_ENDPOINT_DATA_TOOLTIP];
    }

    // if we got an error and it's a 400 with unenrolled in the error message (alerts can exist for endpoint that are no longer around)
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

    return [false, undefined];
  }, [endpointHostInfo, endpointId, error, isFetching]);

  const handleResponseActionsClick = useCallback(() => {
    if (endpointHostInfo) showEndpointResponseActionsConsole(endpointHostInfo.metadata);
    if (onClick) onClick();
  }, [endpointHostInfo, onClick, showEndpointResponseActionsConsole]);

  return { handleResponseActionsClick, isDisabled, tooltip };
};
