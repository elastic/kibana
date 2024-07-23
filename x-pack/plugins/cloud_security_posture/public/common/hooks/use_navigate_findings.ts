/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Filter } from '@kbn/es-query';
import {
  LATEST_FINDINGS_INDEX_PATTERN,
  SECURITY_DEFAULT_DATA_VIEW_ID,
} from '../../../common/constants';
import { findingsNavigation } from '../navigation/constants';
import { encodeQuery } from '../navigation/query_utils';
import { useKibana } from './use_kibana';
import { useDataView } from '../api/use_data_view';

interface NegatedValue {
  value: string | number;
  negate: boolean;
}

type FilterValue = string | number | NegatedValue;

export type NavFilter = Record<string, FilterValue>;

const createFilter = (key: string, filterValue: FilterValue, dataViewId: string): Filter => {
  let negate = false;
  let value = filterValue;
  if (typeof filterValue === 'object') {
    negate = filterValue.negate;
    value = filterValue.value;
  }
  // If the value is '*', we want to create an exists filter
  if (value === '*') {
    return {
      query: { exists: { field: key } },
      meta: { type: 'exists', index: dataViewId },
    };
  }
  return {
    meta: {
      alias: null,
      negate,
      disabled: false,
      type: 'phrase',
      key,
      index: dataViewId,
    },
    query: { match_phrase: { [key]: value } },
  };
};
const useNavigate = (pathname: string, dataViewId = SECURITY_DEFAULT_DATA_VIEW_ID) => {
  const history = useHistory();
  const { services } = useKibana();

  return useCallback(
    (filterParams: NavFilter = {}, groupBy?: string[]) => {
      const filters = Object.entries(filterParams).map(([key, filterValue]) =>
        createFilter(key, filterValue, dataViewId)
      );

      history.push({
        pathname,
        search: encodeQuery({
          // Set query language from user's preference
          query: services.data.query.queryString.getDefaultQuery(),
          filters,
          ...(groupBy && { groupBy }),
        }),
      });
    },
    [history, pathname, services.data.query.queryString, dataViewId]
  );
};

export const useNavigateFindings = () => {
  const { data } = useDataView(LATEST_FINDINGS_INDEX_PATTERN);
  return useNavigate(findingsNavigation.findings_default.path, data?.id);
};

export const useNavigateVulnerabilities = () =>
  useNavigate(findingsNavigation.vulnerabilities.path);
