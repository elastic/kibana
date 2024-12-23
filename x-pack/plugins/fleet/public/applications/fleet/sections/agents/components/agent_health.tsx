/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import type { EuiBadgeProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiIcon,
  EuiLink,
  EuiPortal,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';

import { euiLightVars as euiVars } from '@kbn/ui-theme';

import {
  getPreviousAgentStatusForOfflineAgents,
  isAgentInFailedUpgradeState,
  isStuckInUpdating,
} from '../../../../../../common/services/agent_status';

import type { Agent } from '../../../types';
import { useStartServices } from '../../../hooks';

import { useAgentRefresh } from '../agent_details_page/hooks';

import { AgentUpgradeAgentModal } from './agent_upgrade_modal';

type Props = EuiBadgeProps & {
  agent: Agent;
  fromDetails?: boolean;
};

function getStatusComponent({
  status,
  ...restOfProps
}: {
  status: Agent['status'];
} & EuiBadgeProps): React.ReactElement {
  switch (status) {
    case 'error':
    case 'degraded':
      return (
        <EuiBadge color="warning" {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.unhealthyStatusText"
            defaultMessage="Unhealthy"
          />
        </EuiBadge>
      );
    case 'inactive':
      return (
        <EuiBadge color={euiVars.euiColorDarkShade} {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.inactiveStatusText"
            defaultMessage="Inactive"
          />
        </EuiBadge>
      );
    case 'offline':
      return (
        <EuiBadge color="default" {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.offlineStatusText"
            defaultMessage="Offline"
          />
        </EuiBadge>
      );
    case 'unenrolling':
    case 'enrolling':
    case 'updating':
      return (
        <EuiBadge color="primary" {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.updatingStatusText"
            defaultMessage="Updating"
          />
        </EuiBadge>
      );
    case 'unenrolled':
      return (
        <EuiBadge color={euiVars.euiColorDisabled} {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.unenrolledStatusText"
            defaultMessage="Unenrolled"
          />
        </EuiBadge>
      );
    default:
      return (
        <EuiBadge color="success" {...restOfProps}>
          <FormattedMessage
            id="xpack.fleet.agentHealth.healthyStatusText"
            defaultMessage="Healthy"
          />
        </EuiBadge>
      );
  }
}

const WrappedEuiCallOut = styled(EuiCallOut)`
  white-space: wrap !important;
`;

export const AgentHealth: React.FunctionComponent<Props> = ({
  agent,
  fromDetails,
  ...restOfProps
}) => {
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

  const { docLinks } = useStartServices();

  return (
    <>
      <EuiToolTip
        position="top"
        content={
          <>
            <p>{lastCheckinText}</p>
            <p>{lastCheckInMessageText}</p>
            {isStuckInUpdating(agent) ? (
              isAgentInFailedUpgradeState(agent) ? (
                <FormattedMessage
                  id="xpack.fleet.agentHealth.failedUpgradeTooltipText"
                  defaultMessage="Agent upgrade failed. Consider restarting the upgrade."
                />
              ) : (
                <p>
                  <FormattedMessage
                    id="xpack.fleet.agentHealth.restartUpgradeTooltipText"
                    defaultMessage="Agent may be stuck updating. Consider restarting the upgrade."
                  />
                </p>
              )
            ) : null}
          </>
        }
      >
        {isStuckInUpdating(agent) && !fromDetails ? (
          <div className="eui-textNoWrap">
            {getStatusComponent({ status: agent.status, ...restOfProps })}
            &nbsp;
            <EuiIcon type="warning" color="warning" />
          </div>
        ) : (
          <>
            {getStatusComponent({ status: agent.status, ...restOfProps })}
            {previousToOfflineStatus
              ? getStatusComponent({ status: previousToOfflineStatus, ...restOfProps })
              : null}
          </>
        )}
      </EuiToolTip>
      {fromDetails && isStuckInUpdating(agent) ? (
        <>
          <EuiSpacer size="m" />
          <WrappedEuiCallOut
            iconType="warning"
            size="m"
            color="warning"
            title={
              isAgentInFailedUpgradeState(agent) ? (
                <FormattedMessage
                  id="xpack.fleet.agentHealth.failedUpgradeTitle"
                  defaultMessage="Agent upgrade is stuck in failed state."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.agentHealth.stuckUpdatingTitle"
                  defaultMessage="Agent may be stuck updating."
                />
              )
            }
          >
            <p>
              <FormattedMessage
                id="xpack.fleet.agentHealth.stuckUpdatingText"
                defaultMessage="{stuckMessage} Consider restarting the upgrade. {learnMore}"
                values={{
                  stuckMessage: isAgentInFailedUpgradeState(agent)
                    ? 'Agent upgrade failed.'
                    : 'Agent has been updating for a while, and may be stuck.',
                  learnMore: (
                    <div>
                      <EuiLink href={docLinks.links.fleet.upgradeElasticAgent} target="_blank">
                        <FormattedMessage
                          id="xpack.fleet.agentHealth.upgradeAgentsDocLink"
                          defaultMessage="Learn more"
                        />
                      </EuiLink>
                    </div>
                  ),
                }}
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
