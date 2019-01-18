/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { StaticIndexPattern } from 'ui/index_patterns';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { DataProvider } from './data_providers/data_provider';

// `@timestamp >= ${startDate} and @timestamp <= ${moment().valueOf()}`
export const combineQueries = (
  dataProviders: DataProvider[],
  indexPattern: StaticIndexPattern
): { filterQuery: string } | null => {
  if (isEmpty(dataProviders)) {
    return null;
  }

  const globalQuery = dataProviders.reduce((query, dataProvider) => {
    const prepend = (q: string) => `${q !== '' ? `${q} or ` : ''}`;

    return dataProvider.enabled
      ? `${prepend(query)} (${dataProvider.queryMatch}${
          dataProvider.queryDate ? ` and ${dataProvider.queryDate})` : ')'
        }`
      : query;
  }, '');

  if (isEmpty(globalQuery)) {
    return null;
  }
  return {
    filterQuery: convertKueryToElasticSearchQuery(globalQuery, indexPattern),
  };
};

interface CalculateBodyHeightParams {
  /** The the height of the flyout container, which is typically the entire "page", not including the standard Kibana navigation */
  flyoutHeight?: number;
  /** The flyout header typically contains a title and a close button */
  flyoutHeaderHeight?: number;
  /** All non-body timeline content (i.e. the providers drag and drop area, and the column headers)  */
  timelineHeaderHeight?: number;
  /** Footer content that appears below the body (i.e. paging controls) */
  timelineFooterHeight?: number;
}

export const calculateBodyHeight = ({
  flyoutHeight = 0,
  flyoutHeaderHeight = 0,
  timelineHeaderHeight = 0,
  timelineFooterHeight = 0,
}: CalculateBodyHeightParams): number =>
  flyoutHeight - (flyoutHeaderHeight + timelineHeaderHeight + timelineFooterHeight);
