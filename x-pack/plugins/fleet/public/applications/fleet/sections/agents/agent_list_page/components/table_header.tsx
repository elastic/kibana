/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import type { Agent, SimplifiedAgentStatus } from '../../../../types';

import { AgentStatusBar } from './status_bar';
import { AgentsSelectionStatus } from './agents_selection_status';
import {} from '@elastic/eui';
import { AgentStatusBadges } from './status_badges';
import type { SelectionMode } from './types';

export const AgentTableHeader: React.FunctionComponent<{
  agentStatus?: { [k in SimplifiedAgentStatus]: number };
  showInactive: boolean;
  totalAgents: number;
  selectableAgents: number;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
}> = ({
  agentStatus,
  totalAgents,
  selectableAgents,
  selectionMode,
  setSelectionMode,
  selectedAgents,
  setSelectedAgents,
  showInactive,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <AgentsSelectionStatus
            totalAgents={totalAgents}
            selectableAgents={selectableAgents}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedAgents={selectedAgents}
            setSelectedAgents={setSelectedAgents}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {agentStatus && (
            <AgentStatusBadges showInactive={showInactive} agentStatus={agentStatus} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {agentStatus && <AgentStatusBar agentStatus={agentStatus} />}
    </>
  );
};
