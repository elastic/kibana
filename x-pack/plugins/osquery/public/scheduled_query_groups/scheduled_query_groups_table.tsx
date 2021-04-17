/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, uniq, map } from 'lodash/fp';
import { EuiInMemoryTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { UseQueryResult, useQueries } from 'react-query';

import {
  GetOneAgentPolicyResponse,
  PackagePolicy,
  agentPolicyRouteService,
} from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';
import { useScheduledQueryGroups } from './use_scheduled_query_groups';
import { ActiveStateSwitch } from './active_state_switch';

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`scheduled_query_groups/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: PackagePolicy) => (
  <ScheduledQueryName id={item.id} name={item.name} />
);

const ScheduledQueryGroupsTableComponent = () => {
  const {
    application: { getUrlForApp },
    http,
  } = useKibana().services;

  const { data } = useScheduledQueryGroups();

  const uniqAgentPolicyIds = useMemo<string[]>(() => {
    if (!data?.items) {
      return [];
    }

    return uniq(map('policy_id', data.items));
  }, [data?.items]);

  const agentPolicies = useQueries(
    uniqAgentPolicyIds.map((policyId) => ({
      queryKey: ['agentPolicy', policyId],
      queryFn: () => http.get(agentPolicyRouteService.getInfoPath(policyId)),
    }))
  ) as Array<UseQueryResult<GetOneAgentPolicyResponse>>;

  const renderAgentPolicy = useCallback(
    (policyId) => {
      const policyDetails: UseQueryResult<GetOneAgentPolicyResponse> | undefined = find(
        ['data.item.id', policyId],
        agentPolicies
      );

      return (
        <EuiLink
          href={getUrlForApp('fleet', {
            path: `#` + pagePathGetters.policy_details({ policyId }),
          })}
          target="_blank"
        >
          {policyDetails?.data?.item?.name ?? policyId}
        </EuiLink>
      );
    },
    [agentPolicies, getUrlForApp]
  );

  const renderQueries = useCallback(
    (streams: PackagePolicy['inputs'][0]['streams']) => <>{streams.length}</>,
    []
  );

  const renderActive = useCallback((_, item) => <ActiveStateSwitch item={item} />, []);

  const columns: Array<EuiBasicTableColumn<PackagePolicy>> = useMemo(
    () => [
      {
        field: 'name',
        name: 'Name',
        sortable: true,
        render: renderName,
      },
      {
        field: 'policy_id',
        name: 'Policy',
        truncate: true,
        render: renderAgentPolicy,
      },
      {
        field: 'inputs[0].streams',
        name: 'Number of queries',
        render: renderQueries,
      },
      {
        field: 'enabled',
        name: 'Active',
        sortable: true,
        align: 'right',
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
