/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import { buildRangeFilter, Filter } from '@kbn/es-query';
import { Logger } from '@kbn/core/server';
import {
  DataView,
  DataViewSpec,
  getTime,
  ISearchSource,
  ISearchStartSearchSource,
  SortDirection,
} from '@kbn/data-plugin/common';
import { OnlySearchSourceRuleParams } from '../types';

export async function fetchSearchSourceQuery(
  ruleId: string,
  params: OnlySearchSourceRuleParams,
  latestTimestamp: string | undefined,
  publicBaseUrl: string,
  spacePrefix: string,
  services: {
    logger: Logger;
    searchSourceClient: ISearchStartSearchSource;
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

  const dataViewChecksum = getDataViewChecksum(index.toSpec(false));
  const ruleParamsChecksum = getRuleParamsChecksum(params as OnlySearchSourceRuleParams);
  const link = `${publicBaseUrl}${spacePrefix}/app/discover#/viewAlert/${ruleId}?from=${dateStart}&to=${dateEnd}&ruleParamsChecksum=${ruleParamsChecksum}&dataViewChecksum=${dataViewChecksum}`;

  return {
    link,
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

  const timerangeFilter = getTime(index, {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  });
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

function getDataViewChecksum(index: DataViewSpec) {
  const { title, timeFieldName, sourceFilters, runtimeFieldMap } = index;
  return sha256
    .create()
    .update(JSON.stringify({ title, timeFieldName, sourceFilters, runtimeFieldMap }))
    .hex();
}

/**
 * Get rule params checksum skipping serialized data view object
 */
function getRuleParamsChecksum(params: OnlySearchSourceRuleParams) {
  return sha256
    .create()
    .update(
      JSON.stringify(params, (key: string, value: string) => (key === 'index' ? undefined : value))
    )
    .hex();
}
