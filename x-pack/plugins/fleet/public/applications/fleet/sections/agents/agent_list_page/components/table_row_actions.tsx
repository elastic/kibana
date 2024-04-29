/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { isAgentRequestDiagnosticsSupported } from '../../../../../../../common/services';

import { isStuckInUpdating } from '../../../../../../../common/services/agent_status';

import type { Agent, AgentPolicy } from '../../../../types';
import { useLink } from '../../../../hooks';
import { useAuthz } from '../../../../../../hooks/use_authz';
import { ContextMenuActions } from '../../../../components';
import { isAgentUpgradeable } from '../../../../services';
import { ExperimentalFeaturesService } from '../../../../services';

export const TableRowActions: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  onReassignClick: () => void;
  onUnenrollClick: () => void;
  onGetUninstallCommandClick: () => void;
  onUpgradeClick: () => void;
  onAddRemoveTagsClick: (button: HTMLElement) => void;
  onRequestDiagnosticsClick: () => void;
}> = ({
  agent,
  agentPolicy,
  onReassignClick,
  onUnenrollClick,
  onGetUninstallCommandClick,
  onUpgradeClick,
  onAddRemoveTagsClick,
  onRequestDiagnosticsClick,
}) => {
  const { getHref } = useLink();
  const authz = useAuthz();

  const isUnenrolling = agent.status === 'unenrolling';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { diagnosticFileUploadEnabled, agentTamperProtectionEnabled } =
    ExperimentalFeaturesService.get();
  const menuItems = [
    <EuiContextMenuItem
      icon="inspect"
      href={getHref('agent_details', { agentId: agent.id })}
      key="viewAgent"
    >
      <FormattedMessage id="xpack.fleet.agentList.viewActionText" defaultMessage="View agent" />
    </EuiContextMenuItem>,
  ];

  if (authz.fleet.allAgents && agentPolicy?.is_managed === false) {
    menuItems.push(
      <EuiContextMenuItem
        icon="tag"
        onClick={(event) => {
          onAddRemoveTagsClick((event.target as Element).closest('button')!);
        }}
        disabled={!agent.active}
        key="addRemoveTags"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.addRemoveTagsActionText"
          defaultMessage="Add / remove tags"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        icon="pencil"
        onClick={() => {
          onReassignClick();
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
        key="agentUnenrollBtn"
        disabled={!agent.active}
        icon="trash"
        onClick={() => {
          onUnenrollClick();
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
        key="agentUpgradeBtn"
        icon="refresh"
        disabled={!isAgentUpgradeable(agent)}
        onClick={() => {
          onUpgradeClick();
        }}
        data-test-subj="upgradeBtn"
      >
        <FormattedMessage
          id="xpack.fleet.agentList.upgradeOneButton"
          defaultMessage="Upgrade agent"
        />
      </EuiContextMenuItem>
    );

    if (authz.fleet.allAgents && isStuckInUpdating(agent)) {
      menuItems.push(
        <EuiContextMenuItem
          key="agentRestartUpgradeBtn"
          icon="refresh"
          onClick={() => {
            onUpgradeClick();
          }}
          data-test-subj="restartUpgradeBtn"
        >
          <FormattedMessage
            id="xpack.fleet.agentList.restartUpgradeOneButton"
            defaultMessage="Restart upgrade"
          />
        </EuiContextMenuItem>
      );
    }

    if (authz.fleet.allAgents && agentTamperProtectionEnabled && agent.policy_id) {
      menuItems.push(
        <EuiContextMenuItem
          icon="minusInCircle"
          onClick={() => {
            onGetUninstallCommandClick();
            setIsMenuOpen(false);
          }}
          disabled={!agent.active}
          key="getUninstallCommand"
          data-test-subj="uninstallAgentMenuItem"
        >
          <FormattedMessage
            id="xpack.fleet.agentList.getUninstallCommand"
            defaultMessage="Uninstall agent"
          />
        </EuiContextMenuItem>
      );
    }
  }

  if (authz.fleet.readAgents && diagnosticFileUploadEnabled) {
    menuItems.push(
      <EuiContextMenuItem
        key="requestAgentDiagnosticsBtn"
        icon="download"
        data-test-subj="requestAgentDiagnosticsBtn"
        disabled={!isAgentRequestDiagnosticsSupported(agent)}
        onClick={() => {
          onRequestDiagnosticsClick();
        }}
      >
        <FormattedMessage
          id="xpack.fleet.agentList.diagnosticsOneButton"
          defaultMessage="Request diagnostics .zip"
        />
      </EuiContextMenuItem>
    );
  }

  return (
    <ContextMenuActions
      isOpen={isMenuOpen}
      onChange={(isOpen) => setIsMenuOpen(isOpen)}
      items={menuItems}
    />
  );
};
