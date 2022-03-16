/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo } from 'react';
import { EuiPortal, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../types';
import { useAuthz, useKibanaVersion } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';
import {
  AgentUnenrollAgentModal,
  AgentReassignAgentPolicyModal,
  AgentUpgradeAgentModal,
} from '../../components';
import { useAgentRefresh } from '../hooks';
import { isAgentUpgradeable } from '../../../../services';
import { policyHasFleetServer } from '../../services/has_fleet_server';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
}> = memo(({ agent, assignFlyoutOpenByDefault = false, onCancelReassign, agentPolicy }) => {
  const hasFleetAllPrivileges = useAuthz().fleet.all;
  const kibanaVersion = useKibanaVersion();
  const refreshAgent = useAgentRefresh();
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isUnenrolling = agent.status === 'unenrolling';

  const hasFleetServer = agentPolicy && policyHasFleetServer(agentPolicy);

  const onClose = useMemo(() => {
    if (onCancelReassign) {
      return onCancelReassign;
    } else {
      return () => setIsReassignFlyoutOpen(false);
    }
  }, [onCancelReassign, setIsReassignFlyoutOpen]);

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal agents={[agent]} onClose={onClose} />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={[agent]}
            agentCount={1}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgent();
            }}
            useForceUnenroll={isUnenrolling}
            hasFleetServer={hasFleetServer}
          />
        </EuiPortal>
      )}
      {isUpgradeModalOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={[agent]}
            agentCount={1}
            version={kibanaVersion}
            onClose={() => {
              setIsUpgradeModalOpen(false);
              refreshAgent();
            }}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        button={{
          props: { iconType: 'arrowDown', iconSide: 'right', color: 'primary' },
          children: (
            <FormattedMessage
              id="xpack.fleet.agentDetails.actionsButton"
              defaultMessage="Actions"
            />
          ),
        }}
        items={[
          <EuiContextMenuItem
            icon="pencil"
            onClick={() => {
              setIsReassignFlyoutOpen(true);
            }}
            disabled={!agent.active}
            key="reassignPolicy"
          >
            <FormattedMessage
              id="xpack.fleet.agentList.reassignActionText"
              defaultMessage="Assign to new policy"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="cross"
            disabled={!hasFleetAllPrivileges || !agent.active}
            onClick={() => {
              setIsUnenrollModalOpen(true);
            }}
          >
            {isUnenrolling ? (
              <FormattedMessage
                id="xpack.fleet.agentList.forceUnenrollOneButton"
                defaultMessage="Force unenroll"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.agentList.unenrollOneButton"
                defaultMessage="Unenroll agent"
              />
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            icon="refresh"
            disabled={!isAgentUpgradeable(agent, kibanaVersion)}
            onClick={() => {
              setIsUpgradeModalOpen(true);
            }}
          >
            <FormattedMessage
              id="xpack.fleet.agentList.upgradeOneButton"
              defaultMessage="Upgrade agent"
            />
          </EuiContextMenuItem>,
        ]}
      />
    </>
  );
});
