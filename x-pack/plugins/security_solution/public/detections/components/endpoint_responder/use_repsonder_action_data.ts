/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useGetEndpointDetails, useWithShowEndpointResponder } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';
import { useDoesEndpointSupportResponder } from '../../../common/hooks/endpoint/use_does_endpoint_support_responder';
import { UPGRADE_ENDPOINT_FOR_RESPONDER } from '../../../common/translations';

export const NOT_FROM_ENDPOINT_HOST_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
  {
    defaultMessage: 'Add the Elastic Defend integration via Elastic Agent to enable this feature',
  }
);
export const HOST_ENDPOINT_UNENROLLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.unenrolledTooltip',
  { defaultMessage: 'Host is no longer enrolled with the Elastic Defend integration' }
);
export const LOADING_ENDPOINT_DATA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.loadingTooltip',
  { defaultMessage: 'Loading' }
);
export const METADATA_API_ERROR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.generalMetadataErrorTooltip',
  { defaultMessage: 'Failed to retrieve Endpoint metadata' }
);

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

  const isResponderCapabilitiesEnabled = useDoesEndpointSupportResponder(
    endpointHostInfo?.metadata
  );

  const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
    if (!endpointId) {
      return [true, NOT_FROM_ENDPOINT_HOST_TOOLTIP];
    }

    // Still loading Endpoint host info
    if (isFetching) {
      return [true, LOADING_ENDPOINT_DATA_TOOLTIP];
    }

    if (endpointHostInfo && !isResponderCapabilitiesEnabled) {
      return [true, UPGRADE_ENDPOINT_FOR_RESPONDER];
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
  }, [endpointHostInfo, endpointId, error, isFetching, isResponderCapabilitiesEnabled]);

  const handleResponseActionsClick = useCallback(() => {
    if (endpointHostInfo) showEndpointResponseActionsConsole(endpointHostInfo.metadata);
    if (onClick) onClick();
  }, [endpointHostInfo, onClick, showEndpointResponseActionsConsole]);

  return { handleResponseActionsClick, isDisabled, tooltip };
};
