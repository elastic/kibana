/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getParsedParams } from '../lib/helper/parse_search';
import { esKueryInitialStatusSelector } from '../state/selectors';

function hasFilters(search: string) {
  const parsed = getParsedParams(search);
  return typeof parsed.filters !== 'undefined' && parsed.filters !== '';
}

/**
 * Specifically designed for the overview page, this hook will create
 * a function that the caller can use to run code only once the filter
 * index pattern has been initialized. In the case where no filters are
 * defined in the URL path, the check will pass and call the function.
 */
export function useOverviewFilterCheck() {
  const esKueryHasLoaded = useSelector(esKueryInitialStatusSelector);
  const { search } = useLocation();

  return useCallback(
    (fn: () => void) => {
      if (esKueryHasLoaded || !hasFilters(search)) {
        fn();
      }
    },
    [esKueryHasLoaded, search]
  );
}
