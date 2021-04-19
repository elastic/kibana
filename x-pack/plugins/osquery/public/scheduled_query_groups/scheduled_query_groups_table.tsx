/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { PackagePolicy } from '../../../fleet/common';
import { useRouterNavigate } from '../common/lib/kibana';
import { useScheduledQueryGroups } from './use_scheduled_query_groups';
import { ActiveStateSwitch } from './active_state_switch';
import { AgentsPolicyLink } from '../agent_policies/agents_policy_link';

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`scheduled_query_groups/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: PackagePolicy) => (
  <ScheduledQueryName id={item.id} name={item.name} />
);

const ScheduledQueryGroupsTableComponent = () => {
  const { data } = useScheduledQueryGroups();

  const renderAgentPolicy = useCallback((policyId) => <AgentsPolicyLink policyId={policyId} />, []);

  const renderQueries = useCallback(
    (streams: PackagePolicy['inputs'][0]['streams']) => <>{streams.length}</>,
    []
  );

  const renderActive = useCallback((_, item) => <ActiveStateSwitch item={item} />, []);

  const columns: Array<EuiBasicTableColumn<PackagePolicy>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.osquery.scheduledQueryGroups.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: renderName,
      },
      {
        field: 'policy_id',
        name: i18n.translate('xpack.osquery.scheduledQueryGroups.table.policyColumnTitle', {
          defaultMessage: 'Policy',
        }),
        truncateText: true,
        render: renderAgentPolicy,
      },
      {
        field: 'inputs[0].streams',
        name: i18n.translate(
          'xpack.osquery.scheduledQueryGroups.table.numberOfQueriesColumnTitle',
          {
            defaultMessage: 'Number of queries',
          }
        ),
        render: renderQueries,
        width: '150px',
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.osquery.scheduledQueryGroups.table.activeColumnTitle', {
          defaultMessage: 'Active',
        }),
        sortable: true,
        align: 'right',
        width: '80px',
        render: renderActive,
      },
    ],
    [renderActive, renderAgentPolicy, renderQueries]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'name',
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <EuiInMemoryTable<PackagePolicy>
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      items={data?.items ?? []}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};

export const ScheduledQueryGroupsTable = React.memo(ScheduledQueryGroupsTableComponent);
