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
import { esKuerySelector } from '../state/selectors';

function hasFilters(search: string) {
  const parsed = getParsedParams(search);

  return !!parsed.filters || !!parsed.search;
}

/**
 * Specifically designed for the overview page, this hook will create
 * a function that the caller can use to run code only once the filter
 * index pattern has been initialized.
 *
 * In the case where no filters are
 * defined in the URL path, the check will pass and call the function.
 */
export function useOverviewFilterCheck() {
  const filters = useSelector(esKuerySelector);
  const { search } = useLocation();

  /**
   * Here, `filters` represents the pre-processed output of parsing the kuery
   * syntax and unifying it with any top-level filters the user has selected.
   *
   * The `hasFilters` flag will be true when the URL contains a truthy `filters`
   * query key, _or_ a truthy `search` key. The callback `shouldRun` if:
   *
   * 1. `filters` are defined: the initial processing has finished and the app is
   * ready to send its initial requests.
   * 2. There are no search/filters defined in the URL, i.e. `!hasFilters === true`.
   */
  const shouldRun = !!filters || !hasFilters(search);

  return useCallback(
    (fn: () => void) => {
      if (shouldRun) {
        fn();
      }
    },
    [shouldRun]
  );
}
