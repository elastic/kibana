/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type ResponderContextMenuItemProps,
  useResponderActionData,
} from './use_responder_action_data';

export const ResponderContextMenuItem = memo<ResponderContextMenuItemProps>(
  ({ endpointId, onClick }) => {
    const { handleResponseActionsClick, isDisabled, tooltip } = useResponderActionData({
      endpointId,
      onClick,
    });

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
          defaultMessage="Respond"
        />
      </EuiContextMenuItem>
    );
  }
);
ResponderContextMenuItem.displayName = 'ResponderContextMenuItem';
