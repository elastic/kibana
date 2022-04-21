/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildRangeFilter, Filter } from '@kbn/es-query';
import { Logger } from '@kbn/core/server';
import {
  getTime,
  ISearchSource,
  ISearchStartSearchSource,
  SortDirection,
} from '@kbn/data-plugin/common';
import { OnlySearchSourceAlertParams } from '../types';

export async function fetchSearchSourceQuery(
  alertId: string,
  params: OnlySearchSourceAlertParams,
  latestTimestamp: string | undefined,
  services: {
    logger: Logger;
    searchSourceClient: Promise<ISearchStartSearchSource>;
  }
) {
  const { logger, searchSourceClient } = services;
  const client = await searchSourceClient;
  const initialSearchSource = await client.create(params.searchConfiguration);

  const { searchSource, dateStart, dateEnd } = updateSearchSource(
    initialSearchSource,
    params,
    latestTimestamp
  );

  logger.debug(
    `search source query alert (${alertId}) query: ${JSON.stringify(
      searchSource.getSearchRequestBody()
    )}`
  );

  const searchResult = await searchSource.fetch();

  return {
    numMatches: Number(searchResult.hits.total),
    searchResult,
    dateStart,
    dateEnd,
  };
}

export function updateSearchSource(
  searchSource: ISearchSource,
  params: OnlySearchSourceAlertParams,
  latestTimestamp: string | undefined
) {
  const index = searchSource.getField('index');

  const timeFieldName = index?.timeFieldName;
  if (!timeFieldName) {
    throw new Error('Invalid data view without timeFieldName.');
  }

  searchSource.setField('size', params.size);

  const timerangeFilter = getTime(index, {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  });
  const dateStart = timerangeFilter?.query.range[timeFieldName].gte;
  const dateEnd = timerangeFilter?.query.range[timeFieldName].lte;
  const filters = [timerangeFilter];

  if (latestTimestamp && latestTimestamp > dateStart) {
    // add additional filter for documents with a timestamp greater then
    // the timestamp of the previous run, so that those documents are not counted twice
    const field = index.fields.find((f) => f.name === timeFieldName);
    const addTimeRangeField = buildRangeFilter(field!, { gt: latestTimestamp }, index);
    filters.push(addTimeRangeField);
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
