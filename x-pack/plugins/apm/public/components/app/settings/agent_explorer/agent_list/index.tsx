/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import { AgentExplorerFieldName } from '../../../../../../common/agent_explorer';
import { AgentName } from '../../../../../../typings/es_schemas/ui/fields/agent';
import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { AgentIcon } from '../../../../shared/agent_icon';
import { EnvironmentBadge } from '../../../../shared/environment_badge';
import { ItemsBadge } from '../../../../shared/item_badge';
import { ITableColumn, ManagedTable } from '../../../../shared/managed_table';
import { TruncateWithTooltip } from '../../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../agent_explorer_docs_link';
import { AgentInstances } from '../agent_instances';

export type AgentExplorerItem = ValuesType<
  APIReturnType<'GET /internal/apm/get_agents_per_service'>['items']
>;

export function getAgentsColumns({
  selectedAgent,
  onAgentSelected,
}: {
  selectedAgent?: AgentExplorerItem;
  onAgentSelected: (agent: AgentExplorerItem) => void;
}): Array<ITableColumn<AgentExplorerItem>> {
  return [
    {
      field: AgentExplorerFieldName.ServiceName,
      name: '',
      width: '5%',
      render: (_, agent) => {
        const isSelected = selectedAgent === agent;

        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.apm.agentExplorerTable.viewAgentInstances',
              {
                defaultMessage: 'Toggle agent instances view',
              }
            )}
            delay="long"
          >
            <EuiButtonIcon
              size="xs"
              iconSize="s"
              aria-label="Toggle agent instances view"
              data-test-subj="apmAgentExplorerListToggle"
              onClick={() => onAgentSelected(agent)}
              display={isSelected ? 'base' : 'empty'}
              iconType={isSelected ? 'minimize' : 'expand'}
              isSelected={isSelected}
            />
          </EuiToolTip>
        );
      },
    },
    {
      field: AgentExplorerFieldName.ServiceName,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.serviceNameColumnLabel',
        {
          defaultMessage: 'Service Name',
        }
      ),
      sortable: true,
      width: '35%',
      truncateText: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={serviceName}
          content={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={agentName} />
              </EuiFlexItem>
              <EuiFlexItem className="eui-textTruncate">
                <span className="eui-textTruncate">{serviceName}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: AgentExplorerFieldName.Environments,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.environmentColumnLabel',
        {
          defaultMessage: 'Environment',
        }
      ),
      width: '15%',
      truncateText: true,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments} />
      ),
    },
    {
      field: AgentExplorerFieldName.Instances,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.instancesColumnLabel',
        {
          defaultMessage: 'Instances',
        }
      ),
      width: '10%',
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.AgentName,
      width: '15%',
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentNameColumnLabel',
        { defaultMessage: 'Agent Name' }
      ),
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.AgentVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      width: '10%',
      truncateText: true,
      render: (_, { agentVersion }) => (
        <ItemsBadge
          items={agentVersion}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerTable.agentVersionColumnLabel.multipleVersions',
            {
              values: { versionsCount: agentVersion.length },
              defaultMessage:
                '{versionsCount, plural, one {1 version} other {# versions}}',
            }
          )}
        />
      ),
    },
    {
      field: AgentExplorerFieldName.AgentDocsPageUrl,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentDocsColumnLabel',
        { defaultMessage: 'Agent Docs' }
      ),
      width: '10%',
      truncateText: true,
      render: (_, { agentName, agentDocsPageUrl }) => (
        <EuiToolTip content={`${agentName} agent docs`}>
          <AgentExplorerDocsLink
            agentName={agentName as AgentName}
            repositoryUrl={agentDocsPageUrl}
          />
        </EuiToolTip>
      ),
    },
  ];
}

interface Props {
  items: AgentExplorerItem[];
  noItemsMessage: React.ReactNode;
  isLoading: boolean;
}

export function AgentList({ items, noItemsMessage, isLoading }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<AgentExplorerItem>();

  const onAgentSelected = (agent: AgentExplorerItem) => {
    setSelectedAgent(agent);
  };

  const onCloseFlyout = () => {
    setSelectedAgent(undefined);
  };

  const agentColumns = useMemo(
    () => getAgentsColumns({ selectedAgent, onAgentSelected }),
    [selectedAgent]
  );

  return (
    <>
      {selectedAgent && (
        <AgentInstances agent={selectedAgent} onClose={onCloseFlyout} />
      )}
      <ManagedTable
        columns={agentColumns}
        items={items}
        noItemsMessage={noItemsMessage}
        initialSortField={AgentExplorerFieldName.Instances}
        initialSortDirection="desc"
        isLoading={isLoading}
        initialPageSize={25}
      />
    </>
  );
}
