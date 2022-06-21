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
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiIcon,
  EuiPortal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent } from '../../../../types';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
} from '../../components';
import { useLicense } from '../../../../hooks';
import { LICENSE_FOR_SCHEDULE_UPGRADE } from '../../../../../../../common';

import type { SelectionMode } from './types';

const FlexItem = styled(EuiFlexItem)`
  height: ${(props) => props.theme.eui.euiSizeL};
`;
export interface Props {
  totalAgents: number;
  totalInactiveAgents: number;
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
}

export const AgentBulkActions: React.FunctionComponent<Props> = ({
  totalAgents,
  totalInactiveAgents,
  selectionMode,
  currentQuery,
  selectedAgents,
  refreshAgents,
}) => {
  const licenseService = useLicense();
  const isLicenceAllowingScheduleUpgrade = licenseService.hasAtLeast(LICENSE_FOR_SCHEDULE_UPGRADE);

  // Bulk actions menu states
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const closeMenu = () => setIsMenuOpen(false);
  const onClickMenu = () => setIsMenuOpen(!isMenuOpen);

  // Actions states
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState<boolean>(false);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState<boolean>(false);
  const [updateModalState, setUpgradeModalState] = useState({ isOpen: false, isScheduled: false });

  // Check if user is working with only inactive agents
  const atLeastOneActiveAgentSelected =
    selectionMode === 'manual'
      ? !!selectedAgents.find((agent) => agent.active)
      : totalAgents > totalInactiveAgents;
  const totalActiveAgents = totalAgents - totalInactiveAgents;
  const agentCount = selectionMode === 'manual' ? selectedAgents.length : totalActiveAgents;
  const agents = selectionMode === 'manual' ? selectedAgents : currentQuery;

  const panels = [
    {
      id: 0,
      items: [
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.reassignPolicy"
              data-test-subj="agentBulkActionsReassign"
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
              data-test-subj="agentBulkActionsUnenroll"
              defaultMessage="Unenroll {agentCount, plural, one {# agent} other {# agents}}"
              values={{
                agentCount,
              }}
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
              data-test-subj="agentBulkActionsUpgrade"
              defaultMessage="Upgrade {agentCount, plural, one {# agent} other {# agents}}"
              values={{
                agentCount,
              }}
            />
          ),
          icon: <EuiIcon type="refresh" size="m" />,
          disabled: !atLeastOneActiveAgentSelected,
          onClick: () => {
            closeMenu();
            setUpgradeModalState({ isOpen: true, isScheduled: false });
          },
        },
        {
          name: (
            <FormattedMessage
              id="xpack.fleet.agentBulkActions.scheduleUpgradeAgents"
              data-test-subj="agentBulkActionsScheduleUpgrade"
              defaultMessage="Schedule upgrade for {agentCount, plural, one {# agent} other {# agents}}"
              values={{
                agentCount,
              }}
            />
          ),
          icon: <EuiIcon type="timeRefresh" size="m" />,
          disabled: !atLeastOneActiveAgentSelected || !isLicenceAllowingScheduleUpgrade,
          onClick: () => {
            closeMenu();
            setUpgradeModalState({ isOpen: true, isScheduled: true });
          },
        },
      ],
    },
  ];

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
              refreshAgents({ refreshTags: true });
            }}
          />
        </EuiPortal>
      )}
      {updateModalState.isOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={agents}
            agentCount={agentCount}
            isScheduled={updateModalState.isScheduled}
            onClose={() => {
              setUpgradeModalState({ isOpen: false, isScheduled: false });
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {(selectionMode === 'manual' && selectedAgents.length) ||
        (selectionMode === 'query' && totalAgents > 0) ? (
          <>
            <EuiFlexItem grow={false}>
              <EuiPopover
                id="agentBulkActionsMenu"
                button={
                  <EuiButton
                    fill
                    iconType="arrowDown"
                    iconSide="right"
                    onClick={onClickMenu}
                    data-test-subj="agentBulkActionsButton"
                  >
                    <FormattedMessage
                      id="xpack.fleet.agentBulkActions.actions"
                      defaultMessage="Actions"
                    />
                  </EuiButton>
                }
                isOpen={isMenuOpen}
                closePopover={closeMenu}
                panelPaddingSize="none"
                anchorPosition="downLeft"
              >
                <EuiContextMenu initialPanelId={0} panels={panels} />
              </EuiPopover>
            </EuiFlexItem>
          </>
        ) : (
          <FlexItem grow={false} />
        )}
      </EuiFlexGroup>
    </>
  );
};
