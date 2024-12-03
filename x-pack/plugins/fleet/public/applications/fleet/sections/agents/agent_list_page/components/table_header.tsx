/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, SimplifiedAgentStatus } from '../../../../types';

import { AgentStatusBar } from './status_bar';
import { AgentsSelectionStatus } from './agents_selection_status';
import {} from '@elastic/eui';
import { AgentStatusBadges } from './status_badges';
import type { SelectionMode } from './types';

export const AgentTableHeader: React.FunctionComponent<{
  agentStatus?: { [k in SimplifiedAgentStatus]: number };
  totalAgents: number;
  selectableAgents: number;
  totalManagedAgents: number;
  managedAgentsOnCurrentPage: number;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
  clearFilters: () => void;
  isUsingFilter: boolean;
}> = ({
  agentStatus,
  totalAgents,
  totalManagedAgents,
  selectableAgents,
  managedAgentsOnCurrentPage,
  selectionMode,
  setSelectionMode,
  selectedAgents,
  setSelectedAgents,
  clearFilters,
  isUsingFilter,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <AgentsSelectionStatus
              totalAgents={totalAgents}
              totalManagedAgents={totalManagedAgents}
              selectableAgents={selectableAgents}
              managedAgentsOnCurrentPage={managedAgentsOnCurrentPage}
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              selectedAgents={selectedAgents}
              setSelectedAgents={setSelectedAgents}
            />
          </EuiFlexItem>
          {isUsingFilter ? (
            <EuiFlexItem grow={false}>
              <EuiLink onClick={() => clearFilters()}>
                <FormattedMessage
                  id="xpack.fleet.agentList.header.clearFiltersLinkText"
                  defaultMessage="Clear filters"
                />
              </EuiLink>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {agentStatus && <AgentStatusBadges agentStatus={agentStatus} />}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {agentStatus && <AgentStatusBar agentStatus={agentStatus} />}
    </>
  );
};
