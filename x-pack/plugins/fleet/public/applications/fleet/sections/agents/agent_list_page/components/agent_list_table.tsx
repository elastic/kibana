/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { type CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../types';
import { isAgentUpgradeable, ExperimentalFeaturesService } from '../../../../services';
import { AgentHealth } from '../../components';

import type { Pagination } from '../../../../hooks';
import { useAgentVersion } from '../../../../hooks';
import { useLink, useAuthz } from '../../../../hooks';

import { AgentPolicySummaryLine } from '../../../../components';
import { Tags } from '../../components/tags';
import type { AgentMetrics } from '../../../../../../../common/types';
import { formatAgentCPU, formatAgentMemory } from '../../services/agent_metrics';

import { AgentUpgradeStatus } from './agent_upgrade_status';

import { EmptyPrompt } from './empty_prompt';

const VERSION_FIELD = 'local_metadata.elastic.agent.version';
const HOSTNAME_FIELD = 'local_metadata.host.hostname';
function safeMetadata(val: any) {
  if (typeof val !== 'string') {
    return '-';
  }
  return val;
}

interface Props {
  agents: Agent[];
  isLoading: boolean;
  agentPoliciesIndexedById: Record<string, AgentPolicy>;
  renderActions: (a: Agent) => JSX.Element;
  sortField: keyof Agent;
  sortOrder: 'asc' | 'desc';
  onSelectionChange: (agents: Agent[]) => void;
  selected: Agent[];
  showUpgradeable: boolean;
  totalAgents?: number;
  pagination: Pagination;
  onTableChange: (criteria: CriteriaWithPagination<Agent>) => void;
  pageSizeOptions: number[];
  isUsingFilter: boolean;
  setEnrollmentFlyoutState: (
    value: React.SetStateAction<{
      isOpen: boolean;
      selectedPolicyId?: string | undefined;
    }>
  ) => void;
  clearFilters: () => void;
  isCurrentRequestIncremented: boolean;
}

export const AgentListTable: React.FC<Props> = (props: Props) => {
  const {
    agents,
    isLoading,
    agentPoliciesIndexedById,
    renderActions,
    sortField,
    sortOrder,
    onTableChange,
    onSelectionChange,
    selected,
    totalAgents = 0,
    showUpgradeable,
    pagination,
    pageSizeOptions,
    isUsingFilter,
    setEnrollmentFlyoutState,
    clearFilters,
    isCurrentRequestIncremented,
  } = props;

  const authz = useAuthz();
  const { displayAgentMetrics } = ExperimentalFeaturesService.get();

  const { getHref } = useLink();
  const latestAgentVersion = useAgentVersion();

  const isAgentSelectable = (agent: Agent) => {
    if (!agent.active) return false;
    if (!agent.policy_id) return true;

    const agentPolicy = agentPoliciesIndexedById[agent.policy_id];
    const isHosted = agentPolicy?.is_managed === true;
    return !isHosted;
  };

  const noItemsMessage =
    isLoading && isCurrentRequestIncremented ? (
      <FormattedMessage
        id="xpack.fleet.agentList.loadingAgentsMessage"
        defaultMessage="Loading agents…"
      />
    ) : isUsingFilter ? (
      <FormattedMessage
        id="xpack.fleet.agentList.noFilteredAgentsPrompt"
        defaultMessage="No agents found. {clearFiltersLink}"
        values={{
          clearFiltersLink: (
            <EuiLink onClick={() => clearFilters()}>
              <FormattedMessage
                id="xpack.fleet.agentList.clearFiltersLinkText"
                defaultMessage="Clear filters"
              />
            </EuiLink>
          ),
        }}
      />
    ) : (
      <EmptyPrompt
        hasFleetAddAgentsPrivileges={authz.fleet.addAgents}
        setEnrollmentFlyoutState={setEnrollmentFlyoutState}
      />
    );

  const sorting = {
    sort: {
      field: sortField,
      direction: sortOrder,
    },
  };

  const columns = [
    {
      field: 'active',
      sortable: false,
      width: '85px',
      name: i18n.translate('xpack.fleet.agentList.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      render: (active: boolean, agent: any) => <AgentHealth agent={agent} />,
    },
    {
      field: HOSTNAME_FIELD,
      sortable: true,
      name: i18n.translate('xpack.fleet.agentList.hostColumnTitle', {
        defaultMessage: 'Host',
      }),
      width: '185px',
      render: (host: string, agent: Agent) => (
        <EuiFlexGroup gutterSize="none" direction="column">
          <EuiFlexItem grow={false}>
            <EuiLink href={getHref('agent_details', { agentId: agent.id })}>
              {safeMetadata(host)}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Tags tags={agent.tags ?? []} color="subdued" size="xs" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'policy_id',
      sortable: true,
      truncateText: true,
      name: i18n.translate('xpack.fleet.agentList.policyColumnTitle', {
        defaultMessage: 'Agent policy',
      }),
      width: '185px',
      render: (policyId: string, agent: Agent) => {
        const agentPolicy = agentPoliciesIndexedById[policyId];
        const showWarning = agent.policy_revision && agentPolicy?.revision > agent.policy_revision;

        return (
          <EuiFlexGroup gutterSize="m" style={{ minWidth: 0 }} alignItems="center">
            {agentPolicy && (
              <EuiFlexItem grow={false}>
                <AgentPolicySummaryLine direction="column" policy={agentPolicy} agent={agent} />
              </EuiFlexItem>
            )}
            {showWarning && (
              <EuiFlexItem grow={false}>
                <EuiText color="subdued" size="xs" className="eui-textNoWrap">
                  <EuiIcon size="m" type="warning" color="warning" />
                  &nbsp;
                  <FormattedMessage
                    id="xpack.fleet.agentList.outOfDateLabel"
                    defaultMessage="Outdated policy"
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    ...(displayAgentMetrics
      ? [
          {
            field: 'metrics',
            sortable: false,
            name: (
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.fleet.agentList.cpuTooltip"
                    defaultMessage="Average CPU usage in the last 5 minutes. This includes usage from the Agent and the component it supervises. Possible value ranges from 0 to (number of available CPU cores * 100)"
                  />
                }
              >
                <span>
                  <FormattedMessage id="xpack.fleet.agentList.cpuTitle" defaultMessage="CPU" />
                  &nbsp;
                  <EuiIcon type="iInCircle" />
                </span>
              </EuiToolTip>
            ),
            width: '75px',
            render: (metrics: AgentMetrics | undefined, agent: Agent) =>
              formatAgentCPU(
                agent.metrics,
                agent.policy_id ? agentPoliciesIndexedById[agent.policy_id] : undefined
              ),
          },
          {
            field: 'metrics',
            sortable: false,
            name: (
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.fleet.agentList.memoryTooltip"
                    defaultMessage="Average memory usage in the last 5 minutes"
                  />
                }
              >
                <span>
                  <FormattedMessage
                    id="xpack.fleet.agentList.memoryTitle"
                    defaultMessage="Memory"
                  />
                  &nbsp;
                  <EuiIcon type="iInCircle" />
                </span>
              </EuiToolTip>
            ),
            width: '90px',
            render: (metrics: AgentMetrics | undefined, agent: Agent) =>
              formatAgentMemory(
                agent.metrics,
                agent.policy_id ? agentPoliciesIndexedById[agent.policy_id] : undefined
              ),
          },
        ]
      : []),

    {
      field: 'last_checkin',
      sortable: true,
      name: i18n.translate('xpack.fleet.agentList.lastCheckinTitle', {
        defaultMessage: 'Last activity',
      }),
      width: '180px',
      render: (lastCheckin: string, agent: any) =>
        lastCheckin ? <FormattedRelative value={lastCheckin} /> : null,
    },
    {
      field: VERSION_FIELD,
      sortable: true,
      width: '220px',
      name: i18n.translate('xpack.fleet.agentList.versionTitle', {
        defaultMessage: 'Version',
      }),
      render: (version: string, agent: Agent) => (
        <EuiFlexGroup gutterSize="none" style={{ minWidth: 0 }} direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiText size="s" className="eui-textNoWrap">
                  {safeMetadata(version)}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AgentUpgradeStatus
                  isAgentUpgradable={!!(isAgentSelectable(agent) && isAgentUpgradeable(agent))}
                  agent={agent}
                  latestAgentVersion={latestAgentVersion}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate('xpack.fleet.agentList.actionsColumnTitle', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          render: renderActions,
        },
      ],
      width: '100px',
    },
  ];

  return (
    <EuiBasicTable<Agent>
      className="fleet__agentList__table"
      data-test-subj="fleetAgentListTable"
      loading={isLoading}
      noItemsMessage={noItemsMessage}
      items={
        totalAgents
          ? showUpgradeable
            ? agents.filter((agent) => isAgentSelectable(agent) && isAgentUpgradeable(agent))
            : agents
          : []
      }
      itemId="id"
      columns={columns}
      pagination={{
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
        totalItemCount: totalAgents,
        pageSizeOptions,
      }}
      selection={
        !authz.fleet.allAgents
          ? undefined
          : {
              selected,
              onSelectionChange,
              selectable: isAgentSelectable,
              selectableMessage: (selectable, agent) => {
                if (selectable) return '';
                if (!agent.active) {
                  return 'This agent is not active';
                }
                if (agent.policy_id && agentPoliciesIndexedById[agent.policy_id].is_managed) {
                  return 'This action is not available for agents enrolled in an externally managed agent policy';
                }
                return '';
              },
            }
      }
      onChange={onTableChange}
      sorting={sorting}
    />
  );
};
