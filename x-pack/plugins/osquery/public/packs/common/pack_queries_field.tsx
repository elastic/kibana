/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reject } from 'lodash/fp';
import { produce } from 'immer';
import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useQueries } from 'react-query';

import { useKibana } from '../../common/lib/kibana';
import { PackQueriesTable } from '../common/pack_queries_table';
import { AddPackQueryForm } from '../common/add_pack_query';

// @ts-expect-error update types
const PackQueriesFieldComponent = ({ field }) => {
  const { value, setValue } = field;
  const { http } = useKibana().services;

  const packQueriesData = useQueries(
    // @ts-expect-error update types
    value.map((query) => ({
      queryKey: ['savedQuery', { id: query.id }],
      queryFn: () => http.get(`/internal/osquery/saved_query/${query.id}`),
    })) ?? []
  );

  const packQueries = useMemo(
    () =>
      // @ts-expect-error update types
      packQueriesData.reduce((acc, packQueryData) => {
        if (packQueryData.data) {
          return [...acc, packQueryData.data];
        }
        return acc;
      }, []) ?? [],
    [packQueriesData]
  );

  const handleAddQuery = useCallback(
    (newQuery) =>
      setValue(
        produce((draft) => {
          // @ts-expect-error update
          draft.push({
            interval: newQuery.interval,
            query: newQuery.query.attributes.query,
            id: newQuery.query.id,
            name: newQuery.query.attributes.name,
          });
        })
      ),
    [setValue]
  );

  const handleRemoveQuery = useCallback(
    // @ts-expect-error update
    (query) => setValue(produce((draft) => reject(['id', query.id], draft))),
    [setValue]
  );

  return (
    <>
      <PackQueriesTable
        items={packQueries}
        config={field.value}
        handleRemoveQuery={handleRemoveQuery}
      />
      <EuiSpacer />
      <AddPackQueryForm handleSubmit={handleAddQuery} />
    </>
  );
};

export const PackQueriesField = React.memo(PackQueriesFieldComponent);
