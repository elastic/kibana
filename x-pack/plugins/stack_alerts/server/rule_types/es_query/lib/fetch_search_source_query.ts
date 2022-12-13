/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRangeFilter, Filter } from '@kbn/es-query';
import { Logger } from '@kbn/core/server';
import {
  DataView,
  getTime,
  ISearchSource,
  ISearchStartSearchSource,
  SortDirection,
} from '@kbn/data-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { OnlySearchSourceRuleParams } from '../types';

export async function fetchSearchSourceQuery(
  ruleId: string,
  params: OnlySearchSourceRuleParams,
  latestTimestamp: string | undefined,
  spacePrefix: string,
  services: {
    logger: Logger;
    searchSourceClient: ISearchStartSearchSource;
    share: SharePluginStart;
  }
) {
  const { logger, searchSourceClient } = services;

  const initialSearchSource = await searchSourceClient.create(params.searchConfiguration);

  const index = initialSearchSource.getField('index') as DataView;
  if (!isTimeBasedDataView(index)) {
    throw new Error('Invalid data view without timeFieldName.');
  }

  const { searchSource, dateStart, dateEnd } = updateSearchSource(
    initialSearchSource,
    index,
    params,
    latestTimestamp
  );

  logger.debug(
    `search source query rule (${ruleId}) query: ${JSON.stringify(
      searchSource.getSearchRequestBody()
    )}`
  );

  const searchResult = await searchSource.fetch();

  const discoverLocator = services.share.url.locators.get('DISCOVER_APP_LOCATOR');
  const redirectUrlParams = {
    dataViewSpec: { ...index.toSpec(false), id: undefined, version: undefined }, // make separate adhoc data view
    filters: initialSearchSource.getField('filter') as Filter[],
    query: initialSearchSource.getField('query'),
    timeRange: { from: dateStart, to: dateEnd },
  };
  const redirectUrl = discoverLocator!.getRedirectUrl({
    ...redirectUrlParams,
  });

  const [firstPart, rest] = redirectUrl.split('/app');
  return {
    link: firstPart + spacePrefix + '/app' + rest,
    numMatches: Number(searchResult.hits.total),
    searchResult,
    dateStart,
    dateEnd,
  };
}

export function updateSearchSource(
  searchSource: ISearchSource,
  index: DataView,
  params: OnlySearchSourceRuleParams,
  latestTimestamp?: string
) {
  const timeFieldName = index.timeFieldName!;
  searchSource.setField('size', params.size);

  const timeRange = {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  };
  const timerangeFilter = getTime(index, timeRange);
  const dateStart = timerangeFilter?.query.range[timeFieldName].gte;
  const dateEnd = timerangeFilter?.query.range[timeFieldName].lte;
  const filters = [timerangeFilter];

  if (params.excludeHitsFromPreviousRun) {
    if (latestTimestamp && latestTimestamp > dateStart) {
      // add additional filter for documents with a timestamp greater then
      // the timestamp of the previous run, so that those documents are not counted twice
      const field = index.fields.find((f) => f.name === timeFieldName);
      const addTimeRangeField = buildRangeFilter(field!, { gt: latestTimestamp }, index);
      filters.push(addTimeRangeField);
    }
  }

  const searchSourceChild = searchSource.createChild();
  searchSourceChild.setField('filter', filters as Filter[]);
  searchSourceChild.setField('sort', [{ [timeFieldName]: SortDirection.desc }]);

  return {
    searchSource: searchSourceChild,
    dateStart,
    dateEnd,
  };
}

function isTimeBasedDataView(index?: DataView) {
  return index?.timeFieldName;
}
