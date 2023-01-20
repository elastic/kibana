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

const createFilter = (key: string, value: string, negate = false): Filter => ({
  meta: {
    alias: null,
    negate,
    disabled: false,
    type: 'phrase',
    key,
    params: { query: value },
  },
  query: { match_phrase: { [key]: value } },
});

export const useNavigateFindings = (pathname = findingsNavigation.findings_default.path) => {
  const history = useHistory();
  const { services } = useKibana();

  return useCallback(
    (filterParams: Record<string, any> = {}) => {
      const filters = Object.entries(filterParams).map(([key, value]) => createFilter(key, value));
      history.push({
        pathname,
        search: encodeQuery({
          // Set default query from user's preference
          query: services.data.query.queryString.getDefaultQuery(),
          filters,
        }),
      });
    },
    [pathname, history, services.data.query.queryString]
  );
};

export const useNavigateFindingsByResource = () =>
  useNavigateFindings(findingsNavigation.findings_by_resource.path);
