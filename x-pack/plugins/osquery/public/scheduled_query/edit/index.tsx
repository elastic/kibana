/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { EditScheduledQueryForm } from './form';

const EditScheduledQueryPageComponent = () => {
  const { http } = useKibana().services;
  const { scheduledQueryId } = useParams<{ scheduledQueryId: string }>();

  const { data } = useQuery(['scheduledQuery', { scheduledQueryId }], () =>
    http.get(`/internal/osquery/scheduled_query/${scheduledQueryId}`)
  );

  const { data: agentPolicies } = useQuery(
    ['agentPolicy'],
    () => http.get(`/api/fleet/agent_policies`),
    { initialData: { items: [] } }
  );

  const updateScheduledQueryMutation = useMutation((payload) =>
    http.put(`/api/fleet/package_policies/${scheduledQueryId}`, { body: JSON.stringify(payload) })
  );

  if (data) {
    return (
      <EditScheduledQueryForm
        data={data}
        // @ts-expect-error update types
        agentPolicies={agentPolicies?.items}
        // @ts-expect-error update types
        handleSubmit={updateScheduledQueryMutation.mutate}
      />
    );
  }

  return <div>Loading</div>;
};

export const EditScheduledQueryPage = React.memo(EditScheduledQueryPageComponent);
