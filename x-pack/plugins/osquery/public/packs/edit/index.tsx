/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

import React from 'react';
import { useMutation, useQuery } from 'react-query';

import { PackForm } from '../common/pack_form';
import { useKibana } from '../../common/lib/kibana';

interface EditPackPageProps {
  onSuccess: () => void;
  packId: string;
}

const EditPackPageComponent: React.FC<EditPackPageProps> = ({ onSuccess, packId }) => {
  const { http } = useKibana().services;

  const {
    data = {
      queries: [],
    },
  } = useQuery(['pack', { id: packId }], ({ queryKey }) => {
    // @ts-expect-error update types
    return http.get(`/internal/osquery/pack/${queryKey[1].id}`);
  });

  const updatePackMutation = useMutation(
    (payload) =>
      http.put(`/internal/osquery/pack/${packId}`, {
        body: JSON.stringify({
          ...data,
          // @ts-expect-error update types
          ...payload,
        }),
      }),
    {
      onSuccess,
    }
  );

  if (!data.id) {
    return <>{'Loading...'}</>;
  }

  return <PackForm data={data} handleSubmit={updatePackMutation.mutate} />;
};

export const EditPackPage = React.memo(EditPackPageComponent);
