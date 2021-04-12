/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

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
import { useScheduledQueries } from './use_scheduled_queries';

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`scheduled_queries/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: PackagePolicy) => (
  <ScheduledQueryName id={item.id} name={item.name} />
);

const ScheduledQueriesTableComponent = () => {
  const {
    application: { getUrlForApp },
    http,
  } = useKibana().services;

  const { data } = useScheduledQueries();

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
        name: '# queries',
        render: (streams: PackagePolicy['inputs'][0]['streams']) => <>{streams.length}</>,
      },
      {
        field: 'enabled',
        name: 'Active',
        sortable: true,
        render: (enabled, item) => <>{item.enabled ? 'True' : 'False'}</>,
      },
    ],
    [renderAgentPolicy]
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

export const ScheduledQueriesTable = React.memo(ScheduledQueriesTableComponent);
