/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esKuery, IIndexPattern } from '../../../../../src/plugins/data/public';
import { combineFiltersAndUserSearch, stringifyKueries } from '../../common/lib';
import { parseFiltersMap } from '../components/overview/filter_group/parse_filter_map';

const getKueryString = (urlFilters: string): string => {
  if (!urlFilters) return '';

  const filterMap = parseFiltersMap(urlFilters);
  return stringifyKueries(filterMap);
};

export const useUpdateKueryString = (
  indexPattern: IIndexPattern | null,
  filterQueryString = '',
  urlFilters: string
): [string?, Error?] => {
  const kueryString = getKueryString(urlFilters);

  const combinedFilterString = combineFiltersAndUserSearch(filterQueryString, kueryString);

  let esFilters: string | undefined;
  // this try catch is necessary to evaluate user input in kuery bar,
  // this error will be actually shown in UI for user to see
  try {
    if ((filterQueryString || urlFilters) && indexPattern) {
      const ast = esKuery.fromKueryExpression(combinedFilterString);

      const elasticsearchQuery = esKuery.toElasticsearchQuery(ast, indexPattern);

      esFilters = JSON.stringify(elasticsearchQuery);
    }
    return [esFilters];
  } catch (err) {
    return [urlFilters, err];
  }
};
