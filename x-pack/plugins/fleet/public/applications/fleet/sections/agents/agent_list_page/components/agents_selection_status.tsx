/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty } from '@elastic/eui';
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
  selectableAgents: number;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  selectedAgents: Agent[];
  setSelectedAgents: (agents: Agent[]) => void;
}> = ({
  totalAgents,
  selectableAgents,
  selectionMode,
  setSelectionMode,
  selectedAgents,
  setSelectedAgents,
}) => {
  const showSelectEverything =
    selectionMode === 'manual' &&
    selectedAgents.length === selectableAgents &&
    selectableAgents < totalAgents;

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
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.totalAgents"
                defaultMessage="Showing {count, plural, one {# agent} other {# agents}}"
                values={{ count: totalAgents }}
              />
            )}
          </EuiText>
        </EuiFlexItem>
        {(selectionMode === 'manual' && selectedAgents.length) ||
        (selectionMode === 'query' && totalAgents > 0) ? (
          <>
            <FlexItem grow={false}>
              <Divider />
            </FlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.agentsSelected"
                  defaultMessage="{count, plural, one {# agent} other {# agents} =all {All agents}} selected"
                  values={{
                    count: selectionMode === 'manual' ? selectedAgents.length : 'all',
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            {showSelectEverything ? (
              <>
                <FlexItem grow={false}>
                  <Divider />
                </FlexItem>
                <EuiFlexItem grow={false}>
                  <Button size="xs" flush="left" onClick={() => setSelectionMode('query')}>
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
