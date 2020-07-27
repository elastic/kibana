/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import { EuiHealth, EuiToolTip } from '@elastic/eui';
import { Agent } from '../../../types';

interface Props {
  agent: Agent;
}

const Status = {
  Online: (
    <EuiHealth color="success">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.onlineStatusText"
        defaultMessage="Online"
      />
    </EuiHealth>
  ),
  Offline: (
    <EuiHealth color="subdued">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.offlineStatusText"
        defaultMessage="Offline"
      />
    </EuiHealth>
  ),
  Inactive: (
    <EuiHealth color="subdued">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.inactiveStatusText"
        defaultMessage="Inactive"
      />
    </EuiHealth>
  ),
  Warning: (
    <EuiHealth color="warning">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.warningStatusText"
        defaultMessage="Error"
      />
    </EuiHealth>
  ),
  Error: (
    <EuiHealth color="danger">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.errorStatusText"
        defaultMessage="Error"
      />
    </EuiHealth>
  ),
  Degraded: (
    <EuiHealth color="danger">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.degradedStatusText"
        defaultMessage="Degraded"
      />
    </EuiHealth>
  ),
  Enrolling: (
    <EuiHealth color="warning">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.enrollingStatusText"
        defaultMessage="Enrolling"
      />
    </EuiHealth>
  ),
  Unenrolling: (
    <EuiHealth color="warning">
      <FormattedMessage
        id="xpack.ingestManager.agentHealth.unenrollingStatusText"
        defaultMessage="Unenrolling"
      />
    </EuiHealth>
  ),
};

function getStatusComponent(agent: Agent): React.ReactElement {
  switch (agent.status) {
    case 'error':
      return Status.Error;
    case 'degraded':
      return Status.Degraded;
    case 'inactive':
      return Status.Inactive;
    case 'offline':
      return Status.Offline;
    case 'warning':
      return Status.Warning;
    case 'unenrolling':
      return Status.Unenrolling;
    case 'enrolling':
      return Status.Enrolling;
    default:
      return Status.Online;
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
              id="xpack.ingestManager.agentHealth.checkInTooltipText"
              defaultMessage="Last checked in {lastCheckIn}"
              values={{
                lastCheckIn: <FormattedRelative value={msLastCheckIn} />,
              }}
            />
            {agent.current_error_events.map((event, idx) => (
              <p key={idx}>{event.message}</p>
            ))}
          </>
        ) : (
          <FormattedMessage
            id="xpack.ingestManager.agentHealth.noCheckInTooltipText"
            defaultMessage="Never checked in"
          />
        )
      }
    >
      {getStatusComponent(agent)}
    </EuiToolTip>
  );
};
