/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchFieldsFromESQL } from '@kbn/text-based-editor';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';

/**
 * react-query configuration to be used to fetch ES|QL fields
 * it sets limit in query to 0, so we don't fetch unnecessary results, only fields
 */
export const getEsqlQueryConfig = ({
  esqlQuery,
  expressions,
}: {
  esqlQuery: string | undefined;
  expressions: ExpressionsStart;
}) => {
  const emptyResultsEsqlQuery = `${esqlQuery} | limit 0`;
  return {
    queryKey: [(esqlQuery ?? '').trim()],
    queryFn: async () => {
      if (!esqlQuery) {
        return null;
      }
      try {
        const res = await fetchFieldsFromESQL({ esql: emptyResultsEsqlQuery }, expressions);
        return res;
      } catch (e) {
        return { error: e };
      }
    },
    staleTime: 60 * 1000,
  };
};
