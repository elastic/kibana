import { useCallback } from 'react';
import { type Query } from '@kbn/es-query';
import { useKibana } from '../hooks/use_kibana';

export const usePersistedQuery = <T>(getter: ({ filters, query }: FindingsBaseURLQuery) => T) => {
  const {
    data: {
      query: { filterManager, queryString },
    },
  } = useKibana().services;

  return useCallback(
    () =>
      getter({
        filters: filterManager.getAppFilters(),
        query: queryString.getQuery() as Query,
      }),
    [getter, filterManager, queryString]
  );
};
