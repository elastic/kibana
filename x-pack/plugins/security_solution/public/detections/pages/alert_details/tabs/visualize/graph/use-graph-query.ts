/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useHttp } from '../../../../../../common/lib/kibana';

const getQuery = (alertId: string) => ({
  query: {
    bool: {
      should: [
        {
          match_phrase: {
            'kibana.alert.uuid': alertId,
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
  controls: {
    use_significance: true,
    sample_size: 10000,
    timeout: 5000,
  },
  connections: {
    vertices: [
      {
        field: 'host.name',
        size: 5,
        min_doc_count: 1,
      },
      {
        field: 'kibana.alert.rule.name',
        size: 5,
        min_doc_count: 1,
      },
      {
        field: 'kibana.alert.uuid',
        size: 5,
        min_doc_count: 1,
      },
      {
        field: 'user.name',
        size: 10,
        min_doc_count: 1,
      },
    ],
  },
  vertices: [
    {
      field: 'host.name',
      size: 5,
      min_doc_count: 1,
    },
    {
      field: 'kibana.alert.rule.name',
      size: 5,
      min_doc_count: 1,
    },
    {
      field: 'kibana.alert.uuid',
      size: 5,
      min_doc_count: 1,
    },
    {
      field: 'user.name',
      size: 10,
      min_doc_count: 1,
    },
  ],
});

export function useGraphQuery(alertId: string) {
  const http = useHttp();
  const dslQuery = getQuery(alertId);

  const mutation = useMutation((request) => {
    return http.post('/api/graph/graphExplore', request);
  });

  const getWorkspace = useCallback(
    (indexName, query, responseHandler) => {
      const dsl = { index: '.alerts-security.alerts-default', query: dslQuery };
      const request = { body: JSON.stringify(dsl) };
      mutation.mutate(request, {
        onSettled(data) {
          console.log("SETTLED DATA");
        },
        onSuccess(data) {
          console.log('RESPONDING: ', data);
          responseHandler(data?.resp);
        },
        onError(error) {
          console.log({
            loading: false,
            error: true,
            data: undefined,
          });
        },
      });
    },
    [dslQuery, mutation]
  );

  return getWorkspace;
}
