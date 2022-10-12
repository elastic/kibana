/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { buildEsQuery, DataViewBase, Query } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useState } from 'react';
import { useKibanaQuerySettings } from '../../../utils/use_kibana_query_settings';
import { BuiltEsQuery } from '../log_stream';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useSubscription } from '../../../utils/use_observable';

interface ILogFilterState {
  filterQuery: {
    parsedQuery: BuiltEsQuery;
    serializedQuery: string;
    originalQuery: Query;
  } | null;
}

export const useLogFilterState = ({ indexPattern }: { indexPattern: DataViewBase }) => {
  const {
    data: {
      query: { queryString },
    },
  } = useKibanaContextForPlugin().services;
  const kibanaQuerySettings = useKibanaQuerySettings();

  const parseQuery = useCallback(
    (filterQuery: Query) => buildEsQuery(indexPattern, filterQuery, [], kibanaQuerySettings),
    [indexPattern, kibanaQuerySettings]
  );

  const getLogFilterQuery = useCallback(
    (filterQuery: Query) => {
      try {
        const parsedQuery = parseQuery(filterQuery);
        return {
          parsedQuery,
          serializedQuery: JSON.stringify(parsedQuery),
          originalQuery: filterQuery,
        };
      } catch (error) {
        // If for some reason parsing the query fails we should revert back to a safe default. This would most likely happen due to a bad URL parameter.
        queryString.setQuery({
          language: 'kuery',
          query: '',
        });
      }
    },
    [parseQuery, queryString]
  );

  const [logFilterState, setLogFilterState] = useState<ILogFilterState>({
    filterQuery: getLogFilterQuery(queryString.getQuery()) || null,
  });

  const applyLogFilterQuery = useCallback(
    (filterQuery: Query) => {
      const logFilterQuery = getLogFilterQuery(filterQuery);
      if (logFilterQuery) {
        setLogFilterState((previousLogFilterState) => ({
          ...previousLogFilterState,
          filterQuery: logFilterQuery,
        }));
      }
    },
    [getLogFilterQuery]
  );

  useSubscription(
    useMemo(() => queryString.getUpdates$(), [queryString]),
    {
      next: useCallback(() => {
        const esQuery = queryString.getQuery();
        applyLogFilterQuery(esQuery as Query);
      }, [applyLogFilterQuery, queryString]),
    }
  );

  return {
    filterQuery: logFilterState.filterQuery,
    applyLogFilterQuery,
  };
};

export const [LogFilterStateProvider, useLogFilterStateContext] =
  createContainer(useLogFilterState);
