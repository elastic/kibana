/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { AgentExplorerFieldName, AgentExplorerListItem } from '@kbn/apm-plugin/common/agent_explorer';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React, { useMemo } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import { unit } from '../../../../utils/style';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { ServiceLink } from '../../../shared/service_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../../agent_explorer_docs_link';

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function getAgentsColumns({
  query,
}: {
  query: TypeOf<ApmRoutes, '/agent-explorer'>['query'];
}): Array<ITableColumn<AgentExplorerListItem>> {
  return [
    {
      field: AgentExplorerFieldName.ServiceName,
      name: i18n.translate('xpack.apm.agentExplorerTable.serviceNameColumnLabel', {
        defaultMessage: 'Service Name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListServiceLink"
          text={formatString(serviceName)}
          content={
            <ServiceLink
              agentName={agentName}
              query={{ ...query, serviceGroup: '' }}
              serviceName={serviceName}
            />
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
      width: `${unit * 15}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
    } as ITableColumn<AgentExplorerListItem>,
    {
      field: AgentExplorerFieldName.AgentName,
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
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.LatestVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.latestVersionColumnLabel',
        { defaultMessage: 'Latest Version' }
      ),
      width: `${unit * 10}px`,
    },
    {
      field: AgentExplorerFieldName.DocsLink,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentDocsColumnLabel',
        { defaultMessage: 'Agent Docs' }
      ),
      width: `${unit * 10}px`,
      render: (_, { agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListDocsLink"
          text={formatString(`${agentName} agent docs`)}
          content={
            <AgentExplorerDocsLink
              agentName={agentName as AgentName}
            />
          }
        />
      ),
    },
  ];
}

interface Props {
  items: AgentExplorerListItem[];
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
  isFailure?: boolean;
  initialSortField: string | undefined;
  initialPageSize: number;
  initialSortDirection?: 'asc' | 'desc';
  sortFn: (
    sortItems: AgentExplorerListItem[],
    sortField: string | undefined,
    sortDirection: 'asc' | 'desc'
  ) => AgentExplorerListItem[];
}

export function AgentList({
  items,
  noItemsMessage,
  isLoading,
  isFailure,
  initialSortField,
  initialSortDirection,
  initialPageSize,
  sortFn,
}: Props) {

  const {
    // removes pagination and sort instructions from the query so it won't be passed down to next route
    query: {
      page,
      pageSize,
      sortDirection: direction,
      sortField: field,
      ...query
    },
  } = useApmParams('/agent-explorer');

  const agentColumns = useMemo(
    () =>
      getAgentsColumns({ query }),
    [ query ]
  );

  return (
    <EuiFlexGroup gutterSize="xs" direction="column" responsive={false}>
      <EuiFlexItem>
        <ManagedTable<AgentExplorerListItem>
          isLoading={isLoading}
          error={isFailure}
          columns={agentColumns}
          items={items}
          noItemsMessage={noItemsMessage}
          initialSortField={initialSortField}
          initialSortDirection={initialSortDirection}
          initialPageSize={initialPageSize}
          sortFn={(itemsToSort, sortField, sortDirection) =>
            sortFn(
              itemsToSort,
              sortField,
              sortDirection
            )
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
