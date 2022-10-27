/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResponderContextMenuItemProps } from './use_repsonder_action_data';
import { useResponderActionData } from './use_repsonder_action_data';
import { useUserPrivileges } from '../../../common/components/user_privileges';

export const ResponderActionButton = memo<ResponderContextMenuItemProps>(
  ({ endpointId, onClick }) => {
    const { handleResponseActionsClick, isDisabled, tooltip } = useResponderActionData({
      endpointId,
      onClick,
    });
    const endpointPrivileges = useUserPrivileges().endpointPrivileges;

    return endpointPrivileges.canAccessResponseConsole ? (
      <EuiToolTip position="top" content={tooltip}>
        <EuiButton
          fill
          key="endpointResponseActions-action-button"
          data-test-subj="endpointResponseActions-action-button"
          disabled={isDisabled}
          onClick={handleResponseActionsClick}
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.buttonLabel"
            defaultMessage="Respond"
          />
        </EuiButton>
      </EuiToolTip>
    ) : (
      <></>
    );
  }
);
ResponderActionButton.displayName = 'ResponderActionButton';
