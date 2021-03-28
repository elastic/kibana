/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, uniq, map } from 'lodash/fp';
import { EuiInMemoryTable, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueries } from 'react-query';

import { agentPolicyRouteService } from '../../../fleet/common';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';
import { useScheduledQueries } from './use_scheduled_queries';

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`scheduled_queries/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_, item) => <ScheduledQueryName id={item.id} name={item.name} />;

const ScheduledQueriesTableComponent = () => {
  const {
    application: { getUrlForApp },
    http,
  } = useKibana().services;

  const { data } = useScheduledQueries();

  const uniqAgentPolicyIds = useMemo(() => {
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
  );

  const renderAgentPolicy = useCallback(
    (policyId) => {
      const policyDetails = find(['data.item.id', policyId], agentPolicies);

      return (
        <EuiLink href={getUrlForApp('fleet', { path: `#/policies/${policyId}` })} target="_blank">
          {policyDetails?.data?.item?.name ?? policyId}
        </EuiLink>
      );
    },
    [agentPolicies, getUrlForApp]
  );

  const columns = useMemo(
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
        render: (streams) => <>{streams.length}</>,
      },
      {
        field: 'enabled',
        name: 'Active',
        sortable: true,
        render: (enabled, item) => {
          return <>{item.enabled ? 'True' : 'False'}</>;
        },
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
    <EuiInMemoryTable
      items={data?.items ?? []}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};

export const ScheduledQueriesTable = React.memo(ScheduledQueriesTableComponent);
