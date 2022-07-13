/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useGetEndpointDetails, useWithShowEndpointResponder } from '../../../management/hooks';
import { HostStatus } from '../../../../common/endpoint/types';

export const NOT_FROM_ENDPOINT_HOST_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
  {
    defaultMessage:
      'Add the Endpoint and Cloud Security integration via Elastic Agent to enable this feature',
  }
);
export const HOST_ENDPOINT_UNENROLLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.unenrolledTooltip',
  { defaultMessage: 'Host is no longer enrolled with the Endpoint and Cloud Security integration' }
);
export const LOADING_ENDPOINT_DATA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.loadingTooltip',
  { defaultMessage: 'Loading' }
);

export interface ResponderContextMenuItemProps {
  endpointId: string;
  onClick?: () => void;
}

export const ResponderContextMenuItem = memo<ResponderContextMenuItemProps>(
  ({ endpointId, onClick }) => {
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

      // if we got an error and it's a 404 (alerts can exist for endpoint that are no longer around)
      // or,
      // the Host status is `unenrolled`
      if (
        (error && error.body.statusCode === 404) ||
        endpointHostInfo?.host_status === HostStatus.UNENROLLED
      ) {
        return [true, HOST_ENDPOINT_UNENROLLED_TOOLTIP];
      }

      return [false, undefined];
    }, [endpointHostInfo?.host_status, endpointId, error, isFetching]);

    const handleResponseActionsClick = useCallback(() => {
      if (endpointHostInfo) showEndpointResponseActionsConsole(endpointHostInfo.metadata);
      if (onClick) onClick();
    }, [endpointHostInfo, onClick, showEndpointResponseActionsConsole]);

    return (
      <EuiContextMenuItem
        key="endpointResponseActions-action-item"
        data-test-subj="endpointResponseActions-action-item"
        disabled={isDisabled}
        toolTipContent={tooltip}
        size="s"
        onClick={handleResponseActionsClick}
      >
        <FormattedMessage
          id="xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.buttonLabel"
          defaultMessage="Launch responder"
        />
      </EuiContextMenuItem>
    );
  }
);
ResponderContextMenuItem.displayName = 'ResponderContextMenuItem';
