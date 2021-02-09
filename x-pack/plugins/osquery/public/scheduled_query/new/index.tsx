/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { NewScheduledQueryForm } from './form';

const NewScheduledQueryPageComponent = () => {
  const { http } = useKibana().services;
  const history = useHistory();

  const createScheduledQueryMutation = useMutation(
    (payload) => http.post(`/api/fleet/package_policies`, { body: JSON.stringify(payload) }),
    {
      onSuccess: (data) => {
        history.push(`/scheduled_queries/${data.item.id}`);
      },
    }
  );

  return <NewScheduledQueryForm handleSubmit={createScheduledQueryMutation.mutate} />;
};

export const NewScheduledQueryPage = React.memo(NewScheduledQueryPageComponent);
