/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { of, merge } from 'rxjs';
import { buildEsQuery, DataViewBase, Query, AggregateQuery, isOfQueryType } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useState } from 'react';
import { useKibanaQuerySettings } from '../../../utils/use_kibana_query_settings';
import { BuiltEsQuery } from '../log_stream';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useSubscription } from '../../../utils/use_observable';
import { UnsupportedLanguageError, QueryParsingError } from './errors';

interface ILogFilterState {
  filterQuery: {
    parsedQuery: BuiltEsQuery;
    serializedQuery: string;
    originalQuery: Query;
  } | null;
  queryStringQuery: Query | AggregateQuery;
}

const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

// Error toasts
const errorToastTitle = i18n.translate('xpack.infra.logsPage.toolbar.logFilterErrorToastTitle', {
  defaultMessage: 'Log filter error',
});

const unsupportedLanguageError = i18n.translate(
  'xpack.infra.logsPage.toolbar.logFilterUnsupportedLanguageError',
  {
    defaultMessage: 'SQL is not supported',
  }
);

export const useLogFilterState = ({ indexPattern }: { indexPattern: DataViewBase }) => {
  const {
    notifications: { toasts },
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
      const parsedQuery = parseQuery(filterQuery);
      return {
        parsedQuery,
        serializedQuery: JSON.stringify(parsedQuery),
        originalQuery: filterQuery,
      };
    },
    [parseQuery]
  );

  const validateQuery = useCallback(
    (query: Query | AggregateQuery) => {
      if (!isOfQueryType(query)) {
        throw new UnsupportedLanguageError(unsupportedLanguageError);
      }

      try {
        parseQuery(query);
      } catch (error) {
        throw new QueryParsingError(error);
      }
    },
    [parseQuery]
  );

  const handleValidationError = useCallback(
    (error: Error) => {
      if (error instanceof UnsupportedLanguageError) {
        toasts.addError(error, { title: errorToastTitle });
        queryString.setQuery(DEFAULT_QUERY);
      } else if (error instanceof QueryParsingError) {
        toasts.addError(error, { title: errorToastTitle });
      }
    },
    [queryString, toasts]
  );

  const [logFilterState, setLogFilterState] = useState<ILogFilterState>(() => {
    const query = queryString.getQuery();
    try {
      validateQuery(query);
      return {
        filterQuery: getLogFilterQuery(query as Query),
        queryStringQuery: query,
      };
    } catch (error) {
      handleValidationError(error);
      return {
        filterQuery: getLogFilterQuery(DEFAULT_QUERY),
        queryStringQuery: query,
      };
    }
  });

  const applyLogFilterQuery = useCallback(
    (validFilterQuery: Query) => {
      const logFilterQuery = getLogFilterQuery(validFilterQuery);
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
    useMemo(() => {
      return merge(of(undefined), queryString.getUpdates$());
    }, [queryString]),
    useMemo(() => {
      return {
        next: () => {
          try {
            const query = queryString.getQuery();
            setLogFilterState((previousLogFilterState) => ({
              ...previousLogFilterState,
              queryStringQuery: query,
            }));
            validateQuery(query);
            applyLogFilterQuery(query as Query);
          } catch (error) {
            handleValidationError(error);
          }
        },
      };
    }, [applyLogFilterQuery, handleValidationError, queryString, validateQuery])
  );

  return {
    queryStringQuery: logFilterState.queryStringQuery, // NOTE: Query String Manager query.
    filterQuery: logFilterState.filterQuery, // NOTE: Valid and syntactically correct query applied to requests etc.
    applyLogFilterQuery,
  };
};

export const [LogFilterStateProvider, useLogFilterStateContext] =
  createContainer(useLogFilterState);
