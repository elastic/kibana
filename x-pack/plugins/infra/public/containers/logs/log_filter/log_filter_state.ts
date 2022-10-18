/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
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
  validationError: Error | null;
}

const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

// Error toasts
export const errorToastTitle = i18n.translate(
  'xpack.infra.logsPage.toolbar.logFilterErrorToastTitle',
  {
    defaultMessage: 'Log filter error',
  }
);

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
        validationError: null,
      };
    } catch (error) {
      return {
        filterQuery: null,
        queryStringQuery: query,
        validationError: error,
      };
    }
  });

  useEffect(() => {
    if (logFilterState.validationError) {
      handleValidationError(logFilterState.validationError);
    }
  }, [handleValidationError, logFilterState.validationError]);

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
      return merge(of(undefined), queryString.getUpdates$()); // NOTE: getUpdates$ uses skip(1) so we do this to ensure an initial emit of a value.
    }, [queryString]),
    useMemo(() => {
      return {
        next: () => {
          const query = queryString.getQuery();
          try {
            validateQuery(query);
            setLogFilterState((previousLogFilterState) => ({
              ...previousLogFilterState,
              queryStringQuery: query,
              validationError: null,
            }));
            applyLogFilterQuery(query as Query);
          } catch (error) {
            setLogFilterState((previousLogFilterState) => ({
              ...previousLogFilterState,
              queryStringQuery: query,
              validationError: error,
              filterQuery: null,
            }));
          }
        },
      };
    }, [applyLogFilterQuery, queryString, validateQuery])
  );

  return {
    queryStringQuery: logFilterState.queryStringQuery, // NOTE: Query String Manager query.
    filterQuery: logFilterState.filterQuery, // NOTE: Valid and syntactically correct query applied to requests etc.
    applyLogFilterQuery,
    validationError: logFilterState.validationError,
  };
};

export const [LogFilterStateProvider, useLogFilterStateContext] =
  createContainer(useLogFilterState);
