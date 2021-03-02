/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from 'react-use';
import { useDispatch } from 'react-redux';
import { useGetUrlParams, useUpdateKueryString, useUrlParams } from '../../../hooks';
import { setEsKueryString } from '../../../state/actions';
import { useIndexPattern } from './use_index_pattern';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { UptimePluginServices } from '../../../apps/plugin';

enum SyntaxType {
  text = 'text',
  kuery = 'kuery',
}
const SYNTAX_STORAGE = 'uptime:queryBarSyntax';

export const useQueryBar = () => {
  const { index_pattern: indexPattern } = useIndexPattern();

  const dispatch = useDispatch();

  const { absoluteDateRangeStart, absoluteDateRangeEnd, ...params } = useGetUrlParams();
  const { search, query: queryParam, filters: paramFilters } = params;

  const {
    services: { storage },
  } = useKibana<UptimePluginServices>();

  const [query, setQuery] = useState(
    queryParam
      ? {
          query: queryParam,
          language: SyntaxType.kuery,
        }
      : search
      ? { query: search, language: SyntaxType.kuery }
      : {
          query: '',
          language: storage.get(SYNTAX_STORAGE) ?? SyntaxType.text,
        }
  );

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

  useEffect(() => {
    setEsKueryFilters(esFilters ?? '');
  }, [esFilters, setEsKueryFilters]);

  useDebounce(
    () => {
      if (query.language === SyntaxType.text) {
        updateUrlParams({ query: query.query as string });
      }
    },
    250,
    [query]
  );

  useEffect(() => {
    storage.set(SYNTAX_STORAGE, query.language);
  }, [query.language, storage]);

  useDebounce(
    () => {
      if (query.language === SyntaxType.kuery && !error && esFilters) {
        updateUrlParams({ search: query.query as string });
      }
    },
    250,
    [esFilters, error]
  );

  return { query, setQuery };
};
