/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Filter } from '@kbn/es-query';
import { findingsNavigation } from '../navigation/constants';
import { encodeQuery } from '../navigation/query_utils';
import { useKibana } from './use_kibana';

interface NegatedValue {
  value: string | number;
  negate: boolean;
}

type FilterValue = string | number | NegatedValue;

export type NavFilter = Record<string, FilterValue>;

const createFilter = (key: string, filterValue: FilterValue): Filter => {
  let negate = false;
  let value = filterValue;
  if (typeof filterValue === 'object') {
    negate = filterValue.negate;
    value = filterValue.value;
  }

  return {
    meta: {
      alias: null,
      negate,
      disabled: false,
      type: 'phrase',
      key,
    },
    query: { match_phrase: { [key]: value } },
  };
};

const useNavigate = (pathname: string) => {
  const history = useHistory();
  const { services } = useKibana();

  return useCallback(
    (filterParams: NavFilter = {}) => {
      const filters = Object.entries(filterParams).map(([key, filterValue]) =>
        createFilter(key, filterValue)
      );

      history.push({
        pathname,
        search: encodeQuery({
          // Set query language from user's preference
          query: services.data.query.queryString.getDefaultQuery(),
          filters,
        }),
      });
    },
    [pathname, history, services.data.query.queryString]
  );
};

export const useNavigateFindings = () => useNavigate(findingsNavigation.findings_default.path);

export const useNavigateFindingsByResource = () =>
  useNavigate(findingsNavigation.findings_by_resource.path);
