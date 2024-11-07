/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty, EuiIconTip } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { SO_SEARCH_LIMIT } from '../../../../constants';
import type { Agent } from '../../../../types';

import type { SelectionMode } from './types';

const Divider = styled.div`
  width: 0;
  height: ${(props) => props.theme.eui.euiSizeL};
  border-left: ${(props) => props.theme.eui.euiBorderThin};
`;

const FlexItem = styled(EuiFlexItem)`
  height: ${(props) => props.theme.eui.euiSizeL};
`;

const Button = styled(EuiButtonEmpty)`
  .euiButtonEmpty__text {
    font-size: ${(props) => props.theme.eui.euiFontSizeXS};
  }
`;

export const AgentsSelectionStatus: React.FunctionComponent<{
  totalAgents: number;
  totalManagedAgents: number;
  selectableAgents: number;
  managedAgentsOnCurrentPage: number;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
}> = ({
  totalAgents,
  totalManagedAgents,
  selectableAgents,
  managedAgentsOnCurrentPage,
  selectionMode,
  setSelectionMode,
  selectedAgents,
  setSelectedAgents,
}) => {
  const showSelectionInfoAndOptions =
    (selectionMode === 'manual' && selectedAgents.length > 0) ||
    (selectionMode === 'query' && totalAgents > 0);
  const showSelectEverything =
    selectionMode === 'manual' &&
    selectedAgents.length === selectableAgents &&
    selectableAgents < totalAgents - managedAgentsOnCurrentPage;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {totalAgents > SO_SEARCH_LIMIT ? (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.totalAgentsWithLimit"
                defaultMessage="Showing {count} of {total} agents"
                values={{
                  count: <FormattedNumber value={SO_SEARCH_LIMIT} />,
                  total: <FormattedNumber value={totalAgents} />,
                }}
              />
            ) : (
              <>
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.totalAgents"
                  defaultMessage="Showing {count, plural, one {# agent} other {# agents}}"
                  values={{ count: totalAgents }}
                />{' '}
                <EuiIconTip
                  type="iInCircle"
                  content={
                    <FormattedMessage
                      data-test-subj="selectedAgentCountTooltip"
                      id="xpack.fleet.agentBulkActions.agentsBreakDownTooltip"
                      defaultMessage=" {totalAgents} total agents: {totalSelected} user-managed agents, {totalManagedAgents} on hosted policies"
                      values={{
                        totalAgents,
                        totalManagedAgents,
                        totalSelected: totalAgents - totalManagedAgents,
                      }}
                    />
                  }
                />
              </>
            )}
          </EuiText>
        </EuiFlexItem>
        {showSelectionInfoAndOptions ? (
          <>
            <FlexItem grow={false}>
              <Divider />
            </FlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="selectedAgentCountLabel">
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.agentsSelected"
                  defaultMessage="{selectionMode, select,
                    manual { {count, plural, one {# agent} other {# agents}} }
                    other {All agents}
                  } selected"
                  values={{
                    selectionMode,
                    count: selectedAgents.length,
                  }}
                />{' '}
                {selectionMode === 'query' && (
                  <EuiIconTip
                    type="iInCircle"
                    content={
                      <FormattedMessage
                        data-test-subj="selectedAgentCountTooltip"
                        id="xpack.fleet.agentBulkActions.agentsSelectedTooltip"
                        defaultMessage="{totalSelected} user-managed agents selected: {totalAgents} total agents, {totalManagedAgents} on hosted policies. Most actions are only available to user-managed agents."
                        values={{
                          totalAgents,
                          totalManagedAgents,
                          totalSelected: totalAgents - totalManagedAgents,
                        }}
                      />
                    }
                  />
                )}
              </EuiText>
            </EuiFlexItem>
            {showSelectEverything ? (
              <>
                <FlexItem grow={false}>
                  <Divider />
                </FlexItem>
                <EuiFlexItem grow={false}>
                  <Button
                    size="xs"
                    flush="left"
                    data-test-subj="selectedEverythingOnAllPagesButton"
                    onClick={() => setSelectionMode('query')}
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentBulkActions.selectAll"
                      defaultMessage="Select everything on all pages"
                    />
                  </Button>
                </EuiFlexItem>
              </>
            ) : null}
            <FlexItem grow={false}>
              <Divider />
            </FlexItem>
            <EuiFlexItem grow={false}>
              <Button
                size="xs"
                flush="left"
                data-test-subj="clearAgentSelectionButton"
                onClick={() => {
                  setSelectionMode('manual');
                  setSelectedAgents([]);
                }}
              >
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.clearSelection"
                  defaultMessage="Clear selection"
                />
              </Button>
            </EuiFlexItem>
          </>
        ) : (
          <FlexItem grow={false} />
        )}
      </EuiFlexGroup>
    </>
  );
};
