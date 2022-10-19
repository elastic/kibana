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
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import { unit } from '../../../../utils/style';
import { ApmRoutes } from '../../../routing/apm_route_config';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { ServiceLink } from '../../../shared/service_link';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { AgentExplorerDocsLink } from '../../agent_explorer_docs_link';
import { ItemsBadge } from '../../../shared/item_badge';
import { RIGHT_ALIGNMENT } from '@elastic/eui';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { AgentInstances } from '../agent_instances';

function formatString(value?: string | null) {
  return value || NOT_AVAILABLE_LABEL;
}

export function getAgentsColumns({
  query,
  toggleRow,
  itemMap,
}: {
  query: TypeOf<ApmRoutes, '/agent-explorer'>['query'];
  toggleRow: (selectedServiceName: string) => void;
  itemMap: Record<string, ReactNode>;
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
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentNameColumnLabel',
        { defaultMessage: 'Agent Name' }
      ),
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.Instances,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.instancesColumnLabel',
        { defaultMessage: 'Instances' }
      ),
      sortable: true,
    },
    {
      field: AgentExplorerFieldName.AgentVersion,
      name: i18n.translate(
        'xpack.apm.agentExplorerTable.agentVersionColumnLabel',
        { defaultMessage: 'Agent Version' }
      ),
      render: (_, { agentVersions }) => (
        <ItemsBadge
          items={agentVersions ?? []}
          multipleItemsMessage={i18n.translate(
            'xpack.apm.agentExplorerTable.agentVersionColumnLabel.multipleVersions',
            { 
              values: { versionsCount: agentVersions.length },
              defaultMessage: '{versionsCount, plural, one {1 version} other {# versions}}',
            }
          )}
        />
      ),
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
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      name: (
        <EuiScreenReaderOnly>
          <span>
            {i18n.translate('xpack.apm.storageExplorer.table.expandRow', {
              defaultMessage: 'Expand row',
            })}
          </span>
        </EuiScreenReaderOnly>
      ),
      render: ({ serviceName }: { serviceName: string }) => {
        return (
          <EuiButtonIcon
            data-test-subj={`storageDetailsButton_${serviceName}`}
            onClick={() => toggleRow(serviceName)}
            aria-label={
              itemMap[serviceName]
                ? i18n.translate('xpack.apm.storageExplorer.table.collapse', {
                    defaultMessage: 'Collapse',
                  })
                : i18n.translate('xpack.apm.storageExplorer.table.expand', {
                    defaultMessage: 'Expand',
                  })
            }
            iconType={
              itemMap[serviceName] ? 'arrowUp' : 'arrowDown'
            }
          />
        );
      },
    },
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
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReactNode>
  >({});

  useEffect(() => {
    // Closes any open rows when fetching new items
    setItemIdToExpandedRowMap({});
  }, [items]);

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

  const toggleRow = (selectedServiceName: string) => {
    const expandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (expandedRowMapValues[selectedServiceName]) {
      delete expandedRowMapValues[selectedServiceName];
    } else {
      expandedRowMapValues[selectedServiceName] = (
        <AgentInstances
          serviceName={selectedServiceName}
        />
      );
    }
    setItemIdToExpandedRowMap(expandedRowMapValues);
  };

  const agentColumns = useMemo(
    () =>
      getAgentsColumns({ query, toggleRow, itemMap: itemIdToExpandedRowMap }),
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
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
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
