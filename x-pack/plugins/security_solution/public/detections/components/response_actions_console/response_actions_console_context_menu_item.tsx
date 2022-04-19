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

export interface ResponseActionsConsoleContextMenuItemProps {
  endpointId?: string;
  onClick?: () => void;
}

export const ResponseActionsConsoleContextMenuItem =
  memo<ResponseActionsConsoleContextMenuItemProps>(({ endpointId, onClick }) => {
    const handleResponseActionsClick = useCallback(() => {
      if (onClick) onClick();
    }, [onClick]);

    const [isDisabled, tooltip]: [disabled: boolean, tooltip: ReactNode] = useMemo(() => {
      // FIXME:PT add check for agentStatus === HostStatus.UNENROLLED
      return [
        !endpointId,
        !endpointId
          ? i18n.translate(
              'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
              { defaultMessage: 'The current item does not support endpoint response actions' }
            )
          : undefined,
      ];
    }, [endpointId]);

    // TODO:PT menu item should be disabled until we get the actual metadata doc for the endpoint
    // TODO:PT menu item should be disabled if host status is un-enrolled (show tooltip)
    // TODO:PT menu item should be disabled if not an Alert

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
