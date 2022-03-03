/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildRangeFilter, Filter } from '@kbn/es-query';
import { Logger } from 'kibana/server';
import { OnlySearchSourceAlertParams } from '../../types';
import { getTime, ISearchStartSearchSource } from '../../../../../../../../src/plugins/data/common';

export async function fetchSearchSourceQuery(
  alertId: string,
  params: OnlySearchSourceAlertParams,
  timestamp: string | undefined,
  services: {
    logger: Logger;
    searchSourceClient: Promise<ISearchStartSearchSource>;
  }
) {
  const { logger, searchSourceClient } = services;
  const client = await searchSourceClient;
  const loadedSearchSource = await client.create(params.searchConfiguration);
  const index = loadedSearchSource.getField('index');

  const timeFieldName = index?.timeFieldName;
  if (!timeFieldName) {
    throw new Error('Invalid data view without timeFieldName.');
  }

  loadedSearchSource.setField('size', params.size);

  const timerangeFilter = getTime(index, {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  });
  const dateStart = timerangeFilter?.query.range[timeFieldName].gte;
  const dateEnd = timerangeFilter?.query.range[timeFieldName].lte;
  const filters = [timerangeFilter];

  if (timestamp) {
    const field = index.fields.find((f) => f.name === timeFieldName);
    const addTimeRangeField = buildRangeFilter(field!, { gt: timestamp }, index);
    filters.push(addTimeRangeField);
  }
  const searchSourceChild = loadedSearchSource.createChild();
  searchSourceChild.setField('filter', filters as Filter[]);

  logger.debug(
    `search source query alert (${alertId}) query: ${JSON.stringify(
      searchSourceChild.getSearchRequestBody()
    )}`
  );

  const searchResult = await searchSourceChild.fetch();

  return {
    numMatches: Number(searchResult.hits.total),
    searchResult,
    dateStart,
    dateEnd,
  };
}
