/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

import { euiLightVars as euiVars } from '@kbn/ui-theme';

import type { Agent } from '../../../types';

interface Props {
  agent: Agent;
}

const Status = {
  Healthy: (
    <EuiBadge color="success">
      <FormattedMessage id="xpack.fleet.agentHealth.healthyStatusText" defaultMessage="Healthy" />
    </EuiBadge>
  ),
  Offline: (
    <EuiBadge color="default">
      <FormattedMessage id="xpack.fleet.agentHealth.offlineStatusText" defaultMessage="Offline" />
    </EuiBadge>
  ),
  Inactive: (
    <EuiBadge color={euiVars.euiColorDarkShade}>
      <FormattedMessage id="xpack.fleet.agentHealth.inactiveStatusText" defaultMessage="Inactive" />
    </EuiBadge>
  ),
  Unhealthy: (
    <EuiBadge color="warning">
      <FormattedMessage
        id="xpack.fleet.agentHealth.unhealthyStatusText"
        defaultMessage="Unhealthy"
      />
    </EuiBadge>
  ),
  Updating: (
    <EuiBadge color="primary">
      <FormattedMessage id="xpack.fleet.agentHealth.updatingStatusText" defaultMessage="Updating" />
    </EuiBadge>
  ),
};

function getStatusComponent(agent: Agent): React.ReactElement {
  switch (agent.status) {
    case 'warning':
    case 'error':
    case 'degraded':
      return Status.Unhealthy;
    case 'inactive':
      return Status.Inactive;
    case 'offline':
      return Status.Offline;
    case 'unenrolling':
    case 'enrolling':
    case 'updating':
      return Status.Updating;
    default:
      return Status.Healthy;
  }
}

export const AgentHealth: React.FunctionComponent<Props> = ({ agent }) => {
  const { last_checkin: lastCheckIn } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();

  return (
    <EuiToolTip
      position="top"
      content={
        msLastCheckIn ? (
          <>
            <FormattedMessage
              id="xpack.fleet.agentHealth.checkInTooltipText"
              defaultMessage="Last checked in {lastCheckIn}"
              values={{
                lastCheckIn: <FormattedRelative value={msLastCheckIn} />,
              }}
            />
          </>
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentHealth.noCheckInTooltipText"
            defaultMessage="Never checked in"
          />
        )
      }
    >
      {getStatusComponent(agent)}
    </EuiToolTip>
  );
};
