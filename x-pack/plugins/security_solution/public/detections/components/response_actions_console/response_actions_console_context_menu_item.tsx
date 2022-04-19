/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HostStatus } from '../../../../common/endpoint/types';
import { useGetEndpointHostInfo } from '../../../management/hooks/use_get_endpoint_host_info';
import { useShowEndpointResponseActionsConsole } from '../../../management/hooks';

export interface ResponseActionsConsoleContextMenuItemProps {
  endpointId: string;
  onClick?: () => void;
}

export const ResponseActionsConsoleContextMenuItem =
  memo<ResponseActionsConsoleContextMenuItemProps>(({ endpointId, onClick }) => {
    const showEndpointResponseActionsConsole = useShowEndpointResponseActionsConsole();
    const { data: endpointHostInfo, isFetching, error } = useGetEndpointHostInfo(endpointId);

    const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
      if (!endpointId) {
        return [
          true,
          i18n.translate(
            'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
            { defaultMessage: 'The current item does not support endpoint response actions' }
          ),
        ];
      }

      // Still loading Endpoint host info
      if (isFetching) {
        return [true, undefined];
      }

      // if we got an error and it's a 404 (alerts can exist for endpoint that are no longer around)
      // or,
      // the Host status is `unenrolled`
      if (
        (error && error.body.statusCode === 404) ||
        endpointHostInfo?.host_status === HostStatus.UNENROLLED
      ) {
        return [
          true,
          i18n.translate(
            'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.unenrolledTooltip',
            { defaultMessage: 'Host is not longer enrolled with endpoint security' }
          ),
        ];
      }

      return [false, undefined];
    }, [endpointHostInfo?.host_status, endpointId, error, isFetching]);

    const handleResponseActionsClick = useCallback(() => {
      if (endpointHostInfo) showEndpointResponseActionsConsole(endpointHostInfo);
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
          defaultMessage="Response actions"
        />
      </EuiContextMenuItem>
    );
  });
ResponseActionsConsoleContextMenuItem.displayName = 'ResponseActionsConsoleContextMenuItem';
