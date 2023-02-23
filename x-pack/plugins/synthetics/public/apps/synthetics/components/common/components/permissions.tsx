/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiCallOut, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FleetPermissionsCallout = () => {
  return (
    <EuiCallOut title={NEED_PERMISSIONS} color="warning" iconType="help">
      <p>{NEED_FLEET_READ_AGENT_POLICIES_PERMISSION}</p>
    </EuiCallOut>
  );
};

/**
 * If any of the canEditSynthetics or canUpdatePrivateMonitor is false, then wrap the children with a tooltip
 * so that a reason can be conveyed to the user explaining why the action is disabled.
 */
export const NoPermissionsTooltip = ({
  canEditSynthetics = true,
  canUpdatePrivateMonitor = true,
  canAddPrivateMonitor = true,
  children,
}: {
  canEditSynthetics?: boolean;
  canUpdatePrivateMonitor?: boolean;
  canAddPrivateMonitor?: boolean;
  children: ReactNode;
}) => {
  const disabledMessage = getRestrictionReasonLabel(
    canEditSynthetics,
    canUpdatePrivateMonitor,
    canAddPrivateMonitor
  );
  if (disabledMessage) {
    return (
      <EuiToolTip content={disabledMessage}>
        <span>{children}</span>
      </EuiToolTip>
    );
  }

  return <>{children}</>;
};

function getRestrictionReasonLabel(
  canEditSynthetics = true,
  canUpdatePrivateMonitor = true,
  canAddPrivateMonitor = true
): string | undefined {
  return !canEditSynthetics
    ? CANNOT_PERFORM_ACTION_SYNTHETICS
    : !canUpdatePrivateMonitor
    ? CANNOT_PERFORM_ACTION_FLEET
    : !canAddPrivateMonitor
    ? PRIVATE_LOCATIONS_NOT_ALLOWED_MESSAGE
    : undefined;
}

export const NEED_PERMISSIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.needPermissions',
  {
    defaultMessage: 'Need permissions',
  }
);

export const NEED_FLEET_READ_AGENT_POLICIES_PERMISSION = i18n.translate(
  'xpack.synthetics.monitorManagement.needFleetReadAgentPoliciesPermission',
  {
    defaultMessage:
      'You are not authorized to access Fleet. Fleet permissions are required to create new private locations.',
  }
);

export const CANNOT_SAVE_INTEGRATION_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.cannotSaveIntegration',
  {
    defaultMessage:
      'You are not authorized to update integrations. Integrations write permissions are required.',
  }
);

const CANNOT_PERFORM_ACTION_FLEET = i18n.translate(
  'xpack.synthetics.monitorManagement.noFleetPermission',
  {
    defaultMessage:
      'You are not authorized to perform this action. Integrations write permissions are required.',
  }
);

const CANNOT_PERFORM_ACTION_SYNTHETICS = i18n.translate(
  'xpack.synthetics.monitorManagement.noSyntheticsPermissions',
  {
    defaultMessage: 'You do not have sufficient permissions to perform this action.',
  }
);

const PRIVATE_LOCATIONS_NOT_ALLOWED_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.privateLocationsNotAllowedMessage',
  {
    defaultMessage:
      'You do not have permission to add monitors to private locations. Contact your administrator to request access.',
  }
);
