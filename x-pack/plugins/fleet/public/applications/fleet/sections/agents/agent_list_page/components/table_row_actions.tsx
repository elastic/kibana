/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../types';
import { useAuthz, useLink, useKibanaVersion } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';
import { isAgentUpgradeable } from '../../../../services';
import { ExperimentalFeaturesService } from '../../../../services';

export const TableRowActions: React.FunctionComponent<{
  agent: Agent;
  agentPolicy?: AgentPolicy;
  onReassignClick: () => void;
  onUnenrollClick: () => void;
  onUpgradeClick: () => void;
  onAddRemoveTagsClick: (button: HTMLElement) => void;
  onRequestDiagnosticsClick: () => void;
}> = ({
  agent,
  agentPolicy,
  onReassignClick,
  onUnenrollClick,
  onUpgradeClick,
  onAddRemoveTagsClick,
  onRequestDiagnosticsClick,
}) => {
  const { getHref } = useLink();
  const hasFleetAllPrivileges = useAuthz().fleet.all;

  const isUnenrolling = agent.status === 'unenrolling';
  const kibanaVersion = useKibanaVersion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { diagnosticFileUploadEnabled } = ExperimentalFeaturesService.get();
  const menuItems = [
    <EuiContextMenuItem
      icon="inspect"
      href={getHref('agent_details', { agentId: agent.id })}
      key="viewAgent"
    >
      <FormattedMessage id="xpack.fleet.agentList.viewActionText" defaultMessage="View agent" />
    </EuiContextMenuItem>,
  ];

  if (agentPolicy?.is_managed === false) {
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
        disabled={!hasFleetAllPrivileges || !agent.active}
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
        icon="refresh"
        disabled={!isAgentUpgradeable(agent, kibanaVersion)}
        onClick={() => {
          onUpgradeClick();
        }}
      >
        <FormattedMessage
          id="xpack.fleet.agentList.upgradeOneButton"
          defaultMessage="Upgrade agent"
        />
      </EuiContextMenuItem>
    );

    if (diagnosticFileUploadEnabled) {
      menuItems.push(
        <EuiContextMenuItem
          icon="download"
          disabled={!hasFleetAllPrivileges}
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
  }
  return (
    <ContextMenuActions
      isOpen={isMenuOpen}
      onChange={(isOpen) => setIsMenuOpen(isOpen)}
      items={menuItems}
    />
  );
};
