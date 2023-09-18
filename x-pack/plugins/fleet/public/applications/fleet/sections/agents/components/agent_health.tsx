/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiIcon,
  EuiPortal,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { euiLightVars as euiVars } from '@kbn/ui-theme';

import {
  getPreviousAgentStatusForOfflineAgents,
  isStuckInUpdating,
} from '../../../../../../common/services/agent_status';

import type { Agent } from '../../../types';

import { useAgentRefresh } from '../agent_details_page/hooks';

import { AgentUpgradeAgentModal } from './agent_upgrade_modal';

interface Props {
  agent: Agent;
  fromDetails?: boolean;
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
  Unenrolled: (
    <EuiBadge color={euiVars.euiColorDisabled}>
      <FormattedMessage
        id="xpack.fleet.agentHealth.unenrolledStatusText"
        defaultMessage="Unenrolled"
      />
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

function getStatusComponent(status: Agent['status']): React.ReactElement {
  switch (status) {
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
    case 'unenrolled':
      return Status.Unenrolled;
    default:
      return Status.Healthy;
  }
}

const WrappedEuiCallOut = styled(EuiCallOut)`
  white-space: wrap !important;
`;

export const AgentHealth: React.FunctionComponent<Props> = ({ agent, fromDetails }) => {
  const { last_checkin: lastCheckIn, last_checkin_message: lastCheckInMessage } = agent;
  const msLastCheckIn = new Date(lastCheckIn || 0).getTime();
  const lastCheckInMessageText = lastCheckInMessage ? (
    <FormattedMessage
      id="xpack.fleet.agentHealth.checkinMessageText"
      defaultMessage="Last checkin message: {lastCheckinMessage}"
      values={{
        lastCheckinMessage: lastCheckInMessage,
      }}
    />
  ) : null;
  const lastCheckinText = msLastCheckIn ? (
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
  );

  const previousToOfflineStatus = useMemo(() => {
    if (!fromDetails || agent.status !== 'offline') {
      return;
    }

    return getPreviousAgentStatusForOfflineAgents(agent);
  }, [fromDetails, agent]);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const refreshAgent = useAgentRefresh();

  return (
    <>
      <EuiToolTip
        position="top"
        content={
          <>
            <p>{lastCheckinText}</p>
            <p>{lastCheckInMessageText}</p>
            {isStuckInUpdating(agent) ? (
              <p>
                <FormattedMessage
                  id="xpack.fleet.agentHealth.restartUpgradeTooltipText"
                  defaultMessage="Agent may be stuck updating. Consider restarting the upgrade."
                />
              </p>
            ) : null}
          </>
        }
      >
        <>
          {getStatusComponent(agent.status)}
          {previousToOfflineStatus ? getStatusComponent(previousToOfflineStatus) : null}
          {isStuckInUpdating(agent) && !fromDetails ? (
            <>
              &nbsp;
              <EuiIcon type="warning" />
            </>
          ) : null}
        </>
      </EuiToolTip>
      {fromDetails && isStuckInUpdating(agent) ? (
        <>
          <EuiSpacer size="m" />
          <WrappedEuiCallOut
            iconType="warning"
            size="m"
            color="warning"
            title={
              <FormattedMessage
                id="xpack.fleet.agentHealth.stuckUpdatingTitle"
                defaultMessage="Agent may be stuck updating."
              />
            }
          >
            <p>
              <FormattedMessage
                id="xpack.fleet.agentHealth.stuckUpdatingText"
                defaultMessage="Agent has been updating for a while, and may be stuck. Consider restarting the upgrade."
              />
            </p>
            <EuiButton
              color="warning"
              onClick={() => {
                setIsUpgradeModalOpen(true);
              }}
              data-test-subj="restartUpgradeBtn"
            >
              <FormattedMessage
                id="xpack.fleet.agentHealth.restartUpgradeBtn"
                defaultMessage="Restart upgrade"
              />
            </EuiButton>
          </WrappedEuiCallOut>
        </>
      ) : null}
      {isUpgradeModalOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={[agent]}
            agentCount={1}
            onClose={() => {
              setIsUpgradeModalOpen(false);
              refreshAgent();
            }}
            isUpdating={true}
          />
        </EuiPortal>
      )}
    </>
  );
};
