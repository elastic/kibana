/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { esQuery, IIndexPattern, Query } from '../../../../../../../src/plugins/data/public';

type ParsedQuery = ReturnType<typeof esQuery.buildEsQuery>;

interface ILogFilterState {
  filterQuery: {
    parsedQuery: ParsedQuery;
    serializedQuery: string;
    originalQuery: Query;
  } | null;
  filterQueryDraft: Query;
  validationErrors: string[];
}

const initialLogFilterState: ILogFilterState = {
  filterQuery: null,
  filterQueryDraft: {
    language: 'kuery',
    query: '',
  },
  validationErrors: [],
};

const validationDebounceTimeout = 1000; // milliseconds

export const useLogFilterState = ({ indexPattern }: { indexPattern: IIndexPattern }) => {
  const [logFilterState, setLogFilterState] = useState<ILogFilterState>(initialLogFilterState);

  const parseQuery = useCallback(
    (filterQuery: Query) => esQuery.buildEsQuery(indexPattern, filterQuery, []),
    [indexPattern]
  );

  const setLogFilterQueryDraft = useCallback((filterQueryDraft: Query) => {
    setLogFilterState((previousLogFilterState) => ({
      ...previousLogFilterState,
      filterQueryDraft,
      validationErrors: [],
    }));
  }, []);

  const [, cancelPendingValidation] = useDebounce(
    () => {
      setLogFilterState((previousLogFilterState) => {
        try {
          parseQuery(logFilterState.filterQueryDraft);
          return {
            ...previousLogFilterState,
            validationErrors: [],
          };
        } catch (error) {
          return {
            ...previousLogFilterState,
            validationErrors: [`${error}`],
          };
        }
      });
    },
    validationDebounceTimeout,
    [logFilterState.filterQueryDraft, parseQuery]
  );

  const applyLogFilterQuery = useCallback(
    (filterQuery: Query) => {
      cancelPendingValidation();
      try {
        const parsedQuery = parseQuery(filterQuery);
        setLogFilterState((previousLogFilterState) => ({
          ...previousLogFilterState,
          filterQuery: {
            parsedQuery,
            serializedQuery: JSON.stringify(parsedQuery),
            originalQuery: filterQuery,
          },
          filterQueryDraft: filterQuery,
          validationErrors: [],
        }));
      } catch (error) {
        setLogFilterState((previousLogFilterState) => ({
          ...previousLogFilterState,
          validationErrors: [`${error}`],
        }));
      }
    },
    [cancelPendingValidation, parseQuery]
  );

  return {
    filterQuery: logFilterState.filterQuery,
    filterQueryDraft: logFilterState.filterQueryDraft,
    isFilterQueryDraftValid: logFilterState.validationErrors.length === 0,
    setLogFilterQueryDraft,
    applyLogFilterQuery,
  };
};

export const LogFilterState = createContainer(useLogFilterState);
