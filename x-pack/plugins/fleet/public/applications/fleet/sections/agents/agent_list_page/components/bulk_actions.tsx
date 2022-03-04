/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPopover,
  EuiContextMenu,
  EuiButtonEmpty,
  EuiIcon,
  EuiPortal,
} from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';

import { SO_SEARCH_LIMIT } from '../../../../constants';
import type { Agent } from '../../../../types';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
} from '../../components';
import { useKibanaVersion } from '../../../../hooks';

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

export type SelectionMode = 'manual' | 'query';

export const AgentBulkActions: React.FunctionComponent<{
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
  totalAgents,
  totalInactiveAgents,
  selectableAgents,
  selectionMode,
  setSelectionMode,
  currentQuery,
  selectedAgents,
  setSelectedAgents,
  refreshAgents,
}) => {
  const kibanaVersion = useKibanaVersion();
  // Bulk actions menu states
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const closeMenu = () => setIsMenuOpen(false);
  const openMenu = () => setIsMenuOpen(true);

  // Actions states
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState<boolean>(false);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // Check if user is working with only inactive agents
  const atLeastOneActiveAgentSelected =
    selectionMode === 'manual'
      ? !!selectedAgents.find((agent) => agent.active)
      : totalAgents > totalInactiveAgents;

  const panels = [
    {
      id: 0,
      items: [
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.reassignPolicy"
              defaultMessage="Assign to new policy"
            />
          ),
          icon: <EuiIcon type="pencil" size="m" />,
          disabled: !atLeastOneActiveAgentSelected,
          onClick: () => {
            closeMenu();
            setIsReassignFlyoutOpen(true);
          },
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.unenrollAgents"
              defaultMessage="Unenroll agents"
            />
          ),
          icon: <EuiIcon type="trash" size="m" />,
          disabled: !atLeastOneActiveAgentSelected,
          onClick: () => {
            closeMenu();
            setIsUnenrollModalOpen(true);
          },
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.upgradeAgents"
              defaultMessage="Upgrade agents"
            />
          ),
          icon: <EuiIcon type="refresh" size="m" />,
          disabled: !atLeastOneActiveAgentSelected,
          onClick: () => {
            closeMenu();
            setIsUpgradeModalOpen(true);
          },
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.clearSelection"
              defaultMessage="Clear selection"
            />
          ),
          icon: <EuiIcon type="cross" size="m" />,
          onClick: () => {
            closeMenu();
            setSelectionMode('manual');
            setSelectedAgents([]);
          },
        },
      ],
    },
  ];

  const showSelectEverything =
    selectionMode === 'manual' &&
    selectedAgents.length === selectableAgents &&
    selectableAgents < totalAgents;

  const totalActiveAgents = totalAgents - totalInactiveAgents;
  const agentCount = selectionMode === 'manual' ? selectedAgents.length : totalActiveAgents;
  const agents = selectionMode === 'manual' ? selectedAgents : currentQuery;

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={agents}
            onClose={() => {
              setIsReassignFlyoutOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isUpgradeModalOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            version={kibanaVersion}
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsUpgradeModalOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="center">
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
              <EuiPopover
                id="agentBulkActionsMenu"
                button={
                  <Button
                    size="xs"
                    iconType="arrowDown"
                    iconSide="right"
                    flush="left"
                    onClick={openMenu}
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentBulkActions.agentsSelected"
                      defaultMessage="{count, plural, one {# agent} other {# agents} =all {All agents}} selected"
                      values={{
                        count: selectionMode === 'manual' ? selectedAgents.length : 'all',
                      }}
                    />
                  </Button>
                }
                isOpen={isMenuOpen}
                closePopover={closeMenu}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu initialPanelId={0} panels={panels} />
              </EuiPopover>
            </EuiFlexItem>
            {showSelectEverything ? (
              <EuiFlexItem grow={false}>
                <Button
                  size="xs"
                  iconType="pagesSelect"
                  iconSide="left"
                  flush="left"
                  onClick={() => setSelectionMode('query')}
                >
                  <FormattedMessage
                    id="xpack.fleet.agentBulkActions.selectAll"
                    defaultMessage="Select everything on all pages"
                  />
                </Button>
              </EuiFlexItem>
            ) : null}
          </>
        ) : (
          <FlexItem grow={false} />
        )}
      </EuiFlexGroup>
    </>
  );
};
