/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Agent, SimplifiedAgentStatus } from '../../../../types';

import { AgentStatusBar } from './status_bar';
import { AgentBulkActions } from './bulk_actions';
import {} from '@elastic/eui';
import { AgentStatusBadges } from './status_badges';

export type SelectionMode = 'manual' | 'query';

export const AgentTableHeader: React.FunctionComponent<{
  agentStatus?: { [k in SimplifiedAgentStatus]: number };
  showInactive: boolean;
  totalAgents: number;
  totalInactiveAgents: number;
  selectableAgents: number;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  currentQuery: string;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
  refreshAgents: () => void;
}> = ({
  agentStatus,
  totalAgents,
  totalInactiveAgents,
  selectableAgents,
  selectionMode,
  setSelectionMode,
  currentQuery,
  selectedAgents,
  setSelectedAgents,
  refreshAgents,
  showInactive,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <AgentBulkActions
            totalAgents={totalAgents}
            totalInactiveAgents={totalInactiveAgents}
            selectableAgents={selectableAgents}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            currentQuery={currentQuery}
            selectedAgents={selectedAgents}
            setSelectedAgents={setSelectedAgents}
            refreshAgents={refreshAgents}
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
