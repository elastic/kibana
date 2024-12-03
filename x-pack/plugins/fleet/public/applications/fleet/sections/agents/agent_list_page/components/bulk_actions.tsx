/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
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

import type { Agent, AgentPolicy } from '../../../../types';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
} from '../../components';
import { useLicense } from '../../../../hooks';
import { LICENSE_FOR_SCHEDULE_UPGRADE, AGENTS_PREFIX } from '../../../../../../../common/constants';
import { ExperimentalFeaturesService } from '../../../../services';

import { getCommonTags } from '../utils';

import { AgentRequestDiagnosticsModal } from '../../components/agent_request_diagnostics_modal';

import { useExportCSV } from '../hooks/export_csv';

import type { SelectionMode } from './types';
import { TagsAddRemove } from './tags_add_remove';

export interface Props {
  nAgentsInTable: number;
  totalManagedAgentIds: string[];
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  agentsOnCurrentPage: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  allTags: string[];
  agentPolicies: AgentPolicy[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const AgentBulkActions: React.FunctionComponent<Props> = ({
  nAgentsInTable,
  totalManagedAgentIds,
  selectionMode,
  currentQuery,
  selectedAgents,
  agentsOnCurrentPage,
  refreshAgents,
  allTags,
  agentPolicies,
  sortField,
  sortOrder,
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
  const [upgradeModalState, setUpgradeModalState] = useState({
    isOpen: false,
    isScheduled: false,
    isUpdating: false,
  });
  const [isTagAddVisible, setIsTagAddVisible] = useState<boolean>(false);
  const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] =
    useState<boolean>(false);

  // update the query removing the "managed" agents in any state (unenrolled, offline, etc)
  const selectionQuery = useMemo(() => {
    if (totalManagedAgentIds.length) {
      const excludedKuery = `${AGENTS_PREFIX}.agent.id : (${totalManagedAgentIds
        .map((id) => `"${id}"`)
        .join(' or ')})`;
      return `(${currentQuery}) AND NOT (${excludedKuery})`;
    } else {
      return currentQuery;
    }
  }, [currentQuery, totalManagedAgentIds]);

  const agents = selectionMode === 'manual' ? selectedAgents : selectionQuery;
  const agentCount =
    selectionMode === 'manual'
      ? selectedAgents.length
      : nAgentsInTable - totalManagedAgentIds?.length;

  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();
  const { diagnosticFileUploadEnabled, enableExportCSV } = ExperimentalFeaturesService.get();

  const { generateReportingJobCSV } = useExportCSV(enableExportCSV);

  const menuItems = [
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.addRemoveTags"
          data-test-subj="agentBulkActionsAddRemoveTags"
          defaultMessage="Add / remove tags"
        />
      ),
      icon: <EuiIcon type="tag" size="m" />,
      onClick: (event: any) => {
        setTagsPopoverButton((event.target as Element).closest('button')!);
        setIsTagAddVisible(!isTagAddVisible);
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.reassignPolicy"
          data-test-subj="agentBulkActionsReassign"
          defaultMessage="Assign to new policy"
        />
      ),
      icon: <EuiIcon type="pencil" size="m" />,
      onClick: () => {
        closeMenu();
        setIsReassignFlyoutOpen(true);
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
      onClick: () => {
        closeMenu();
        setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: false });
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
      disabled: !isLicenceAllowingScheduleUpgrade,
      onClick: () => {
        closeMenu();
        setUpgradeModalState({ isOpen: true, isScheduled: true, isUpdating: false });
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.restartUpgradeAgents"
          data-test-subj="agentBulkActionsRestartUpgrade"
          defaultMessage="Restart upgrade {agentCount, plural, one {# agent} other {# agents}}"
          values={{
            agentCount,
          }}
        />
      ),
      icon: <EuiIcon type="refresh" size="m" />,
      onClick: () => {
        closeMenu();
        setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: true });
      },
    },
    ...(diagnosticFileUploadEnabled
      ? [
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.requestDiagnostics"
                data-test-subj="agentBulkActionsRequestDiagnostics"
                defaultMessage="Request diagnostics for {agentCount, plural, one {# agent} other {# agents}}"
                values={{
                  agentCount,
                }}
              />
            ),
            icon: <EuiIcon type="download" size="m" />,
            onClick: () => {
              closeMenu();
              setIsRequestDiagnosticsModalOpen(true);
            },
          },
        ]
      : []),
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
      onClick: () => {
        closeMenu();
        setIsUnenrollModalOpen(true);
      },
    },
    ...(enableExportCSV
      ? [
          {
            name: (
              <FormattedMessage
                id="xpack.fleet.agentBulkActions.exportAgents"
                data-test-subj="bulkAgentExportBtn"
                defaultMessage="Export {agentCount, plural, one {# agent} other {# agents}} as CSV"
                values={{
                  agentCount,
                }}
              />
            ),
            icon: <EuiIcon type="exportAction" size="m" />,
            onClick: () => {
              closeMenu();
              generateReportingJobCSV(agents, {
                field: sortField,
                direction: sortOrder,
              });
            },
          },
        ]
      : []),
  ];

  const panels = [
    {
      id: 0,
      items: menuItems,
    },
  ];

  const getSelectedTagsFromAgents = useMemo(
    () => getCommonTags(agents, agentsOnCurrentPage ?? [], agentPolicies),
    [agents, agentsOnCurrentPage, agentPolicies]
  );

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
      {upgradeModalState.isOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={agents}
            agentCount={agentCount}
            isScheduled={upgradeModalState.isScheduled}
            isUpdating={upgradeModalState.isUpdating}
            onClose={() => {
              setUpgradeModalState({ isOpen: false, isScheduled: false, isUpdating: false });
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isTagAddVisible && (
        <TagsAddRemove
          agents={Array.isArray(agents) ? agents.map((agent) => agent.id) : agents}
          allTags={allTags ?? []}
          selectedTags={getSelectedTagsFromAgents}
          button={tagsPopoverButton!}
          onTagsUpdated={() => {
            refreshAgents({ refreshTags: true });
          }}
          onClosePopover={() => {
            setIsTagAddVisible(false);
            closeMenu();
          }}
        />
      )}
      {isRequestDiagnosticsModalOpen && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsRequestDiagnosticsModalOpen(false);
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="center">
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
      </EuiFlexGroup>
    </>
  );
};
