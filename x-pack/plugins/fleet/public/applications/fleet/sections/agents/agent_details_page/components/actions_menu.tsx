/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useMemo } from 'react';
import { EuiPortal, EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Agent } from '../../../../types';
import { useCapabilities, useKibanaVersion } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';
import {
  AgentUnenrollAgentModal,
  AgentReassignAgentPolicyFlyout,
  AgentUpgradeAgentModal,
} from '../../components';
import { useAgentRefresh } from '../hooks';
import { isAgentUpgradeable } from '../../../../services';

export const AgentDetailsActionMenu: React.FunctionComponent<{
  agent: Agent;
  assignFlyoutOpenByDefault?: boolean;
  onCancelReassign?: () => void;
}> = memo(({ agent, assignFlyoutOpenByDefault = false, onCancelReassign }) => {
  const hasWriteCapabilites = useCapabilities().write;
  const kibanaVersion = useKibanaVersion();
  const refreshAgent = useAgentRefresh();
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState(assignFlyoutOpenByDefault);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isUnenrolling = agent.status === 'unenrolling';

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
          <AgentReassignAgentPolicyFlyout agents={[agent]} onClose={onClose} />
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
          props: { iconType: 'arrowDown', iconSide: 'right', color: 'primary', fill: true },
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
            disabled={!hasWriteCapabilites || !agent.active}
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
