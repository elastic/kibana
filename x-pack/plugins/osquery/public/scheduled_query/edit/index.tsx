/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { EditScheduledQueryForm } from './form';

const EditScheduledQueryPageComponent = () => {
  const { http } = useKibana().services;
  const { scheduledQueryId } = useParams<{ scheduledQueryId: string }>();

  const { isLoading, data } = useQuery(['scheduledQuery', { scheduledQueryId }], () =>
    http.get(`/internal/osquery/scheduled_query/${scheduledQueryId}`)
  );

  const { data: agentPolicies } = useQuery(['agentPolicy'], () =>
    http.get(`/api/fleet/agent_policies`)
  );

  if (data) {
    return <EditScheduledQueryForm data={data} agentPolicies={agentPolicies?.items ?? []} />;
  }

  return <div>dupa</div>;
};

export const EditScheduledQueryPage = React.memo(EditScheduledQueryPageComponent);
