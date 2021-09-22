/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { PackagePolicy } from '../../../fleet/common';
import { useRouterNavigate } from '../common/lib/kibana';
import { usePacks } from './use_packs';
import { ActiveStateSwitch } from './active_state_switch';
import { AgentsPolicyLink } from '../agent_policies/agents_policy_link';

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`packs/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: PackagePolicy) => (
  <ScheduledQueryName id={item.id} name={item.name} />
);

const PacksTableComponent = () => {
  const { data } = usePacks({});

  const renderAgentPolicyIds = useCallback(
    (agentPolicyIds = []) => (
      <>
        {agentPolicyIds.map((agentPolicyId: string) => (
          <AgentsPolicyLink key={agentPolicyId} policyId={agentPolicyId} />
        ))}
      </>
    ),
    []
  );

  const renderQueries = useCallback(
    (queries: PackagePolicy['inputs'][0]['streams']) => <>{queries.length}</>,
    []
  );

  const renderActive = useCallback((_, item) => <ActiveStateSwitch item={item} />, []);

  const renderUpdatedAt = useCallback((updatedAt, item) => {
    if (!updatedAt) return '-';

    const updatedBy = item.updated_by !== item.created_by ? ` @ ${item.updated_by}` : '';
    return updatedAt ? `${moment(updatedAt).fromNow()}${updatedBy}` : '-';
  }, []);

  const columns: Array<EuiBasicTableColumn<PackagePolicy>> = useMemo(
    () => [
      {
        field: 'attributes.id',
        name: i18n.translate('xpack.osquery.packs.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: renderName,
      },
      {
        field: 'agent_policy_ids',
        name: i18n.translate('xpack.osquery.packs.table.policyColumnTitle', {
          defaultMessage: 'Policy',
        }),
        truncateText: true,
        render: renderAgentPolicyIds,
      },
      {
        field: 'queries',
        name: i18n.translate('xpack.osquery.packs.table.numberOfQueriesColumnTitle', {
          defaultMessage: 'Number of queries',
        }),
        render: renderQueries,
        width: '150px',
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.osquery.packs.table.createdByColumnTitle', {
          defaultMessage: 'Created by',
        }),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: 'Last updated',
        sortable: (item) => (item.updated_at ? Date.parse(item.updated_at) : 0),
        truncateText: true,
        render: renderUpdatedAt,
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.osquery.packs.table.activeColumnTitle', {
          defaultMessage: 'Active',
        }),
        sortable: true,
        align: 'right',
        width: '80px',
        render: renderActive,
      },
    ],
    [renderActive, renderAgentPolicyIds, renderQueries, renderUpdatedAt]
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
      items={data?.saved_objects ?? []}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};

export const PacksTable = React.memo(PacksTableComponent);
