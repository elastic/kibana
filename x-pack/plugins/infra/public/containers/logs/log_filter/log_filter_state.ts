/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { buildEsQuery, DataViewBase, Query, AggregateQuery, isOfQueryType } from '@kbn/es-query';
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
    (filterQuery: Query | AggregateQuery) => {
      try {
        // NOTE: We sync with the QueryString manager - and therefore other solutions - but we don't support SQL syntax.
        if (!isOfQueryType(filterQuery)) {
          throw new Error('Only Query types are supported');
        }
        const parsedQuery = parseQuery(filterQuery);
        return {
          parsedQuery,
          serializedQuery: JSON.stringify(parsedQuery),
          originalQuery: filterQuery,
        };
      } catch (error) {
        // NOTE: If parsing fails or an AggregateQuery is in use
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
    (filterQuery: Query | AggregateQuery) => {
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
    useMemo(() => {
      return {
        next: () => {
          const esQuery = queryString.getQuery();
          applyLogFilterQuery(esQuery);
        },
      };
    }, [applyLogFilterQuery, queryString])
  );

  return {
    filterQuery: logFilterState.filterQuery,
    applyLogFilterQuery,
  };
};

export const [LogFilterStateProvider, useLogFilterStateContext] =
  createContainer(useLogFilterState);
