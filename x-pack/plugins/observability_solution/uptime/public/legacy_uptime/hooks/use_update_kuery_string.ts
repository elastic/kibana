/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { useEffect, useState } from 'react';
import { useUptimeRefreshContext } from '../contexts/uptime_refresh_context';
import { useUptimeDataView } from '../contexts/uptime_data_view_context';
import { TAG_KEY_FOR_AND_CONDITION } from '../components/overview/filter_group/filter_group';
import { combineFiltersAndUserSearch, stringifyKueries } from '../../../common/lib';

const getKueryString = (
  urlFilters: string,
  excludedFilters?: string,
  logicalANDForTag?: boolean
): string => {
  let kueryString = '';
  let excludeKueryString = '';
  // We are using try/catch here because this is user entered value
  // and JSON.parse and stringifyKueries can have hard time parsing
  // all possible scenarios, we can safely ignore if we can't parse them
  try {
    if (urlFilters !== '') {
      const filterMap = new Map<string, Array<string | number>>(JSON.parse(urlFilters));
      kueryString = stringifyKueries(filterMap, logicalANDForTag);
    }
  } catch {
    kueryString = '';
  }

  try {
    if (excludedFilters) {
      const filterMap = new Map<string, Array<string | number>>(JSON.parse(excludedFilters));
      excludeKueryString = stringifyKueries(filterMap, logicalANDForTag);
      if (kueryString) {
        return `${kueryString} and NOT (${excludeKueryString})`;
      }
    } else {
      return kueryString;
    }
  } catch {
    excludeKueryString = '';
  }

  return `NOT (${excludeKueryString})`;
};

export const useGenerateUpdatedKueryString = (
  filterQueryString = '',
  urlFilters: string,
  excludedFilters?: string,
  disableANDFiltering?: boolean
): [string?, Error?] => {
  const dataView = useUptimeDataView();

  const { lastRefresh } = useUptimeRefreshContext();

  const [kueryString, setKueryString] = useState<string>('');

  useEffect(() => {
    if (disableANDFiltering) {
      setKueryString(getKueryString(urlFilters, excludedFilters));
    } else {
      // need a string comparison for local storage
      const useLogicalAND = localStorage.getItem(TAG_KEY_FOR_AND_CONDITION) === 'true';

      setKueryString(getKueryString(urlFilters, excludedFilters, useLogicalAND));
    }
  }, [excludedFilters, urlFilters, lastRefresh, disableANDFiltering]);

  const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);

  let esFilters: string | undefined;
  // this try catch is necessary to evaluate user input in kuery bar,
  // this error will be actually shown in UI for user to see
  try {
    if ((filterQueryString || urlFilters || excludedFilters) && dataView && combinedFilterString) {
      const ast = fromKueryExpression(combinedFilterString);

      const elasticsearchQuery = toElasticsearchQuery(ast, dataView);

      esFilters = JSON.stringify(elasticsearchQuery);
    }
    return [esFilters];
  } catch (err) {
    return [urlFilters, err];
  }
};
