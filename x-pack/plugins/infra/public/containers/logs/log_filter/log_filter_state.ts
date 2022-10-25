/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect } from 'react';
import { merge, of } from 'rxjs';
import { i18n } from '@kbn/i18n';
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
  queryStringQuery: Query | AggregateQuery | null;
  validationError: Error | null;
}

export const DEFAULT_QUERY = {
  language: 'kuery',
  query: '',
};

const INITIAL_LOG_FILTER_STATE = {
  filterQuery: null,
  queryStringQuery: null,
  validationError: null,
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

export const useLogFilterState = ({ dataView }: { dataView: DataViewBase }) => {
  const {
    notifications: { toasts },
    data: {
      query: { queryString },
    },
  } = useKibanaContextForPlugin().services;

  const kibanaQuerySettings = useKibanaQuerySettings();

  const [logFilterState, setLogFilterState] = useState<ILogFilterState>(INITIAL_LOG_FILTER_STATE);

  useEffect(() => {
    const handleValidationError = (error: Error) => {
      if (error instanceof UnsupportedLanguageError) {
        toasts.addError(error, { title: errorToastTitle });
        queryString.setQuery(DEFAULT_QUERY);
      } else if (error instanceof QueryParsingError) {
        toasts.addError(error, { title: errorToastTitle });
      }
    };

    if (logFilterState.validationError) {
      handleValidationError(logFilterState.validationError);
    }
  }, [logFilterState.validationError, queryString, toasts]);

  const parseQuery = useCallback(
    (filterQuery: Query) => {
      return buildEsQuery(dataView, filterQuery, [], kibanaQuerySettings);
    },
    [dataView, kibanaQuerySettings]
  );

  const getNewLogFilterState = useCallback(
    (newQuery: Query | AggregateQuery) =>
      (previousLogFilterState: ILogFilterState): ILogFilterState => {
        try {
          if (!isOfQueryType(newQuery)) {
            throw new UnsupportedLanguageError(unsupportedLanguageError);
          }
          try {
            const parsedQuery = parseQuery(newQuery);
            return {
              filterQuery: {
                parsedQuery,
                serializedQuery: JSON.stringify(parsedQuery),
                originalQuery: newQuery,
              },
              queryStringQuery: newQuery,
              validationError: null,
            };
          } catch (error) {
            throw new QueryParsingError(error);
          }
        } catch (error) {
          return {
            ...previousLogFilterState,
            queryStringQuery: newQuery,
            validationError: error,
          };
        }
      },
    [parseQuery]
  );

  useSubscription(
    useMemo(() => {
      return merge(of(undefined), queryString.getUpdates$()); // NOTE: getUpdates$ uses skip(1) so we do this to ensure an initial emit of a value.
    }, [queryString]),
    useMemo(() => {
      return {
        next: () => {
          setLogFilterState(getNewLogFilterState(queryString.getQuery()));
        },
      };
    }, [getNewLogFilterState, queryString])
  );

  // NOTE: If the dataView changes the query will need to be reparsed and the filter regenerated.
  useEffect(() => {
    if (dataView) {
      setLogFilterState(getNewLogFilterState(queryString.getQuery()));
    }
  }, [dataView, getNewLogFilterState, queryString]);

  return {
    queryStringQuery: logFilterState.queryStringQuery, // NOTE: Query String Manager query.
    filterQuery: logFilterState.filterQuery, // NOTE: Valid and syntactically correct query applied to requests etc.
    validationError: logFilterState.validationError,
  };
};

export const [LogFilterStateProvider, useLogFilterStateContext] =
  createContainer(useLogFilterState);
