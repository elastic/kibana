/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn, EuiFlexGroup,
  EuiFlexItem, EuiInMemoryTable
} from '@elastic/eui';
import { AgentExplorerFieldName, AgentExplorerListItem } from '@kbn/apm-plugin/common/agent_explorer';
import { AgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React, { useMemo } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { unit } from '../../../../utils/style';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ItemsBadge } from '../../../shared/item_badge';
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
}): Array<EuiBasicTableColumn<AgentExplorerListItem>> {
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
    },
    {
      field: AgentExplorerFieldName.AgentName,
      width: `${unit * 10}px`,
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
      width: `${unit * 10}px`,
      render: (_, { agentVersion }) => (
        <ItemsBadge
          items={agentVersion ?? []}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerTable.agentVersionColumnLabel.multipleVersions',
            { 
              values: { versionsCount: agentVersion.length },
              defaultMessage: '{versionsCount, plural, one {1 version} other {# versions}}',
            }
          )}
        />
      ),
    },
    {
      field: AgentExplorerFieldName.AgentLastVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.latestVersionColumnLabel',
        { defaultMessage: 'Latest Version' }
      ),
      width: `${unit * 10}px`,
    },
    {
      field: AgentExplorerFieldName.AgentRepoUrl,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentDocsColumnLabel',
        { defaultMessage: 'Agent Docs' }
      ),
      width: `${unit * 10}px`,
      render: (_, { agentName, agentRepoUrl }) => (
        <TruncateWithTooltip
          data-test-subj="apmAgentExplorerListDocsLink"
          text={formatString(`${agentName} agent docs`)}
          content={
            <AgentExplorerDocsLink
              agentName={agentName as AgentName}
              repositoryUrl={agentRepoUrl}
            />
          }
        />
      ),
    }
  ];
}

interface Props {
  items: AgentExplorerListItem[];
  noItemsMessage?: React.ReactNode;
  isLoading: boolean;
  isFailure?: boolean;
  initialSortField: string;
  initialPageSize: number;
  initialSortDirection: 'asc' | 'desc';
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
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.apm.agentExplorer.table.caption', {
            defaultMessage: 'Agent Explorer',
          })}
          items={items}
          columns={agentColumns}
          pagination={{initialPageSize}}
          sorting={{ sort: {
              field: field ?? initialSortField,
              direction: direction ?? initialSortDirection
            }
          }}
          itemId="serviceName"
          loading={isLoading}
          data-test-subj="agentExplorerTable"
          message={
            isLoading
              ? i18n.translate('xpack.apm.agentExplorer.table.loading', {
                  defaultMessage: 'Loading...',
                })
              : noItemsMessage
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
