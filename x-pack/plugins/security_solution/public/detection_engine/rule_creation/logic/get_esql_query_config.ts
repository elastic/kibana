/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryColumns } from '@kbn/esql-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

/**
 * react-query configuration to be used to fetch ES|QL fields
 * it sets limit in query to 0, so we don't fetch unnecessary results, only fields
 */
export const getEsqlQueryConfig = ({
  esqlQuery,
  data,
}: {
  esqlQuery: string | undefined;
  data: DataPublicPluginStart;
}) => {
  return {
    queryKey: [(esqlQuery ?? '').trim()],
    queryFn: async () => {
      if (!esqlQuery) {
        return null;
      }
      try {
        const res = await getESQLQueryColumns({
          esqlQuery,
          search: data.search.search,
        });
        return res;
      } catch (e) {
        return { error: e };
      }
    },
    staleTime: 60 * 1000,
  };
};
