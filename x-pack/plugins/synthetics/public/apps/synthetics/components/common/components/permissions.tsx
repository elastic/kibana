/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiToolTip, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FleetPermissionsCallout = () => {
  return (
    <EuiCallOut title={NEED_PERMISSIONS_PRIVATE_LOCATIONS} color="warning" iconType="help">
      <p>{NEED_PRIVATE_LOCATIONS_PERMISSION}</p>
      <p>
        <FormattedMessage
          id="xpack.synthetics.privateLocations.needFleetPermission.description"
          defaultMessage="Once there is an agent policy available, you'll be able to manage private locations and monitors with the regular Synthetics app privileges."
        />
      </p>
    </EuiCallOut>
  );
};

/**
 * If canEditSynthetics  is false, then wrap the children with a tooltip
 * so that a reason can be conveyed to the user explaining why the action is disabled.
 */
export const NoPermissionsTooltip = ({
  canEditSynthetics = true,
  canUsePublicLocations = true,
  children,
}: {
  canEditSynthetics?: boolean;
  canUsePublicLocations?: boolean;
  children: ReactNode;
}) => {
  const disabledMessage = getRestrictionReasonLabel(canEditSynthetics, canUsePublicLocations);
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
  canUsePublicLocations = true
): string | undefined {
  const message = !canEditSynthetics ? CANNOT_PERFORM_ACTION_SYNTHETICS : undefined;
  if (message) {
    return message;
  }

  return !canUsePublicLocations ? CANNOT_PERFORM_ACTION_PUBLIC_LOCATIONS : undefined;
}

export const NEED_PERMISSIONS_PRIVATE_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.privateLocations.needPermissions',
  {
    defaultMessage: "You're missing some Kibana privileges to manage private locations",
  }
);

export const ALL = i18n.translate('xpack.synthetics.monitorManagement.privileges.all', {
  defaultMessage: 'All',
});

export const READ = i18n.translate('xpack.synthetics.monitorManagement.privileges.read', {
  defaultMessage: 'Read',
});

export const NEED_PRIVATE_LOCATIONS_PERMISSION = (
  <FormattedMessage
    id="xpack.synthetics.monitorManagement.privateLocations.needFleetPermission"
    defaultMessage="In order to create private locations, you need an agent policy. You are not authorized to create Fleet agent policies. It requires the {all} for Fleet and at least {read} for Integerations kibana priviliges."
    values={{
      all: <EuiCode>{`"${ALL}"`}</EuiCode>,
      read: <EuiCode>{`"${READ}"`}</EuiCode>,
    }}
  />
);

export const CANNOT_PERFORM_ACTION_SYNTHETICS = i18n.translate(
  'xpack.synthetics.monitorManagement.noSyntheticsPermissions',
  {
    defaultMessage: 'You do not have sufficient permissions to perform this action.',
  }
);

export const CANNOT_PERFORM_ACTION_PUBLIC_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.canUsePublicLocations',
  {
    defaultMessage: 'You do not have sufficient permissions to use Elastic managed locations.',
  }
);
