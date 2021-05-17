/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useDebounce } from 'react-use';
import { useDispatch } from 'react-redux';
import { Query } from 'src/plugins/data/common';
import { useGetUrlParams, useUpdateKueryString, useUrlParams } from '../../../hooks';
import { setEsKueryString } from '../../../state/actions';
import { useIndexPattern } from './use_index_pattern';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { UptimePluginServices } from '../../../apps/plugin';

export enum SyntaxType {
  text = 'text',
  kuery = 'kuery',
}
const SYNTAX_STORAGE = 'uptime:queryBarSyntax';

const DEFAULT_QUERY_UPDATE_DEBOUNCE_INTERVAL = 800;

interface UseQueryBarUtils {
  // The Query object used by the search bar
  query: Query;
  // Update the Query object
  setQuery: React.Dispatch<React.SetStateAction<Query>>;
  /**
   * By default the search bar uses a debounce to delay submitting input;
   * this function will cancel the debounce and submit immediately.
   */
  submitImmediately: () => void;
}

/**
 * Provides state management and automatic dispatching of a Query object.
 *
 * @returns {UseQueryBarUtils}
 */
export const useQueryBar = (): UseQueryBarUtils => {
  const dispatch = useDispatch();

  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useGetUrlParams();
  const { search, query: queryParam, filters: paramFilters } = params;

  const {
    services: { storage },
  } = useKibana<UptimePluginServices>();

  const [query, setQuery] = useState<Query>(
    queryParam
      ? {
          query: queryParam,
          language: SyntaxType.text,
        }
      : search
      ? { query: search, language: SyntaxType.kuery }
      : {
          query: '',
          language: storage.get(SYNTAX_STORAGE) ?? SyntaxType.text,
        }
  );

  const { index_pattern: indexPattern } = useIndexPattern();

  const updateUrlParams = useUrlParams()[1];

  const [esFilters, error] = useUpdateKueryString(
    indexPattern,
    query.language === SyntaxType.kuery ? (query.query as string) : undefined,
    paramFilters
  );

  const setEsKueryFilters = useCallback(
    (esFiltersN: string) => dispatch(setEsKueryString(esFiltersN)),
    [dispatch]
  );

  const setEs = useCallback(() => setEsKueryFilters(esFilters ?? ''), [
    esFilters,
    setEsKueryFilters,
  ]);
  const [, cancelEsKueryUpdate] = useDebounce(setEs, DEFAULT_QUERY_UPDATE_DEBOUNCE_INTERVAL, [
    esFilters,
    setEsKueryFilters,
  ]);

  const handleQueryUpdate = useCallback(() => {
    if (query.language === SyntaxType.text && queryParam !== query.query) {
      updateUrlParams({ query: query.query as string });
    }
    if (query.language === SyntaxType.kuery) {
      updateUrlParams({ query: '' });
    }
  }, [query.language, query.query, queryParam, updateUrlParams]);

  const [, cancelQueryUpdate] = useDebounce(
    handleQueryUpdate,
    DEFAULT_QUERY_UPDATE_DEBOUNCE_INTERVAL,
    [query]
  );

  const submitImmediately = useCallback(() => {
    cancelQueryUpdate();
    cancelEsKueryUpdate();
    handleQueryUpdate();
    setEs();
  }, [cancelEsKueryUpdate, cancelQueryUpdate, handleQueryUpdate, setEs]);

  useDebounce(
    () => {
      if (query.language === SyntaxType.kuery && !error && esFilters) {
        updateUrlParams({ search: query.query as string });
      }
      if (query.language === SyntaxType.text) {
        updateUrlParams({ search: '' });
      }
      if (query.language === SyntaxType.kuery && query.query === '') {
        updateUrlParams({ search: '' });
      }
    },
    250,
    [esFilters, error]
  );

  return { query, setQuery, submitImmediately };
};
