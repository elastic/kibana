/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

import { EuiSpacer } from '@elastic/eui';
import { reject } from 'lodash/fp';
import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueries, useQueryClient } from 'react-query';

import { PackQueriesTable } from '../common/pack_queries_table';
import { AddPackQueryForm } from '../common/add_pack_query';
import { PackForm } from '../common/pack_form';
import { useKibana } from '../../common/lib/kibana';

const EditPackPageComponent = () => {
  const queryClient = useQueryClient();
  const { http } = useKibana().services;
  const { packId } = useParams<{ packId: string }>();

  const {
    data = {
      queries: [],
    },
  } = useQuery(['pack', { id: packId }], ({ queryKey }) => {
    return http.get(`/internal/osquery/pack/${queryKey[1].id}`);
  });

  const updatePackMutation = useMutation((payload) =>
    http.put(`/internal/osquery/pack/${packId}`, {
      body: JSON.stringify({
        ...data,
        // @ts-expect-error update types
        ...payload,
      }),
    })
  );

  const removePackQueryMutation = useMutation(
    (payload) =>
      http.put(`/internal/osquery/pack/${packId}`, {
        body: JSON.stringify({
          ...data,
          // @ts-expect-error update types
          queries: reject(['id', payload.id], data.queries),
        }),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pack', { id: packId }]);
      },
    }
  );

  const addPackQueryMutation = useMutation(
    (payload) =>
      http.put(`/internal/osquery/pack/${packId}`, {
        body: JSON.stringify({
          ...data,
          queries: [
            ...data.queries,
            {
              // @ts-expect-error update types
              id: payload.query.id,
              // @ts-expect-error update types
              name: payload.query.attributes.title,
              // @ts-expect-error update types
              interval: payload.interval,
            },
          ],
        }),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pack', { id: packId }]);
      },
    }
  );

  // console.error('data', data);
  const packQueriesData = useQueries(
    // @ts-expect-error update types
    data.queries?.map((query) => ({
      queryKey: ['savedQuery', { id: query.id }],
      queryFn: () => http.get(`/internal/osquery/saved_query/${query.id}`),
    })) ?? []
  );

  // console.error('packQueriesData', packQueriesData);
  const packQueries =
    // @ts-expect-error update types
    packQueriesData.reduce((acc, packQueryData) => {
      if (packQueryData.data) {
        return [...acc, packQueryData.data];
      }
      return acc;
    }, []) ?? [];

  if (!data.id) {
    return <>{'Loading...'}</>;
  }

  return (
    <>
      <PackForm data={data} handleSubmit={updatePackMutation.mutate} />
      <PackQueriesTable
        items={packQueries}
        config={data.queries}
        handleRemoveQuery={removePackQueryMutation.mutate}
      />
      <EuiSpacer />
      <AddPackQueryForm handleSubmit={addPackQueryMutation.mutate} />
    </>
  );
};

export const EditPackPage = React.memo(EditPackPageComponent);
