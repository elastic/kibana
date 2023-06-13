/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { useCallback } from 'react';
import { debounce } from 'lodash';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExpressionsStart, Datatable } from '@kbn/expressions-plugin/public';
import { fetchFieldsFromESQL } from '@kbn/text-based-editor';

import { useKibana } from '@kbn/kibana-react-plugin/public';

type UseEsqlQuery = () => {
  getEsqlFields: (query: string) => Promise<unknown>;
};

export type GetEsqlFields = (esqlQuery: string) => Promise<Datatable | undefined>;

export const useEsqlQuery: UseEsqlQuery = () => {
  const kibana = useKibana<{ expressions: ExpressionsStart }>();
  const queryClient = useQueryClient();

  const { expressions } = kibana.services;

  const getEsqlFields: GetEsqlFields = useCallback(
    (esqlQuery: string) => {
      const emptyResultsEsqlQuery = `${esqlQuery} | limit 1`;
      return queryClient.fetchQuery({
        queryKey: [esqlQuery.trim()],
        queryFn: async () => fetchFieldsFromESQL({ esql: emptyResultsEsqlQuery }, expressions),
        staleTime: 60 * 1000,
      });
    },
    [expressions, queryClient]
  );

  return {
    getEsqlFields,
  };
};
