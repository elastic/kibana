/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRangeFilter, Filter } from '@kbn/es-query';
import {
  DataView,
  DataViewsContract,
  getTime,
  ISearchSource,
  ISearchStartSearchSource,
  SortDirection,
} from '@kbn/data-plugin/common';
import {
  BUCKET_SELECTOR_FIELD,
  buildAggregation,
  isCountAggregation,
  parseAggregationResults,
} from '@kbn/triggers-actions-ui-plugin/common';
import { isGroupAggregation } from '@kbn/triggers-actions-ui-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { Logger } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { OnlySearchSourceRuleParams } from '../types';
import { getComparatorScript } from '../../../../common';

export interface FetchSearchSourceQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
  params: OnlySearchSourceRuleParams;
  latestTimestamp: string | undefined;
  spacePrefix: string;
  services: {
    logger: Logger;
    searchSourceClient: ISearchStartSearchSource;
    share: SharePluginStart;
    dataViews: DataViewsContract;
  };
}

export async function fetchSearchSourceQuery({
  ruleId,
  alertLimit,
  params,
  latestTimestamp,
  spacePrefix,
  services,
}: FetchSearchSourceQueryOpts) {
  const { logger, searchSourceClient } = services;
  const isGroupAgg = isGroupAggregation(params.termField);
  const isCountAgg = isCountAggregation(params.aggType);

  const initialSearchSource = await searchSourceClient.create(params.searchConfiguration);

  const index = initialSearchSource.getField('index') as DataView;
  const { searchSource, dateStart, dateEnd } = updateSearchSource(
    initialSearchSource,
    index,
    params,
    latestTimestamp,
    alertLimit
  );

  logger.debug(
    `search source query rule (${ruleId}) query: ${JSON.stringify(
      searchSource.getSearchRequestBody()
    )}`
  );

  const searchResult = await searchSource.fetch();

  const link = await generateLink(
    initialSearchSource,
    services.share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!,
    services.dataViews,
    index,
    dateStart,
    dateEnd,
    spacePrefix
  );
  return {
    link,
    numMatches: Number(searchResult.hits.total),
    searchResult,
    parsedResults: parseAggregationResults({ isCountAgg, isGroupAgg, esResult: searchResult }),
    dateStart,
    dateEnd,
  };
}

export function updateSearchSource(
  searchSource: ISearchSource,
  index: DataView,
  params: OnlySearchSourceRuleParams,
  latestTimestamp: string | undefined,
  alertLimit?: number
) {
  const isGroupAgg = isGroupAggregation(params.termField);
  const timeFieldName = params.timeField || index.timeFieldName;

  if (!timeFieldName) {
    throw new Error('Invalid data view without timeFieldName.');
  }

  searchSource.setField('size', isGroupAgg ? 0 : params.size);

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
  searchSourceChild.setField(
    'aggs',
    buildAggregation({
      aggType: params.aggType,
      aggField: params.aggField,
      termField: params.termField,
      termSize: params.termSize,
      condition: {
        resultLimit: alertLimit,
        conditionScript: getComparatorScript(
          params.thresholdComparator,
          params.threshold,
          BUCKET_SELECTOR_FIELD
        ),
      },
      ...(isGroupAgg ? { topHitsSize: params.size } : {}),
    })
  );
  return {
    searchSource: searchSourceChild,
    dateStart,
    dateEnd,
  };
}

async function generateLink(
  searchSource: ISearchSource,
  discoverLocator: LocatorPublic<DiscoverAppLocatorParams>,
  dataViews: DataViewsContract,
  dataViewToUpdate: DataView,
  dateStart: string,
  dateEnd: string,
  spacePrefix: string
) {
  const prevFilters = searchSource.getField('filter') as Filter[];

  // make new adhoc data view
  const newDataView = await dataViews.create({
    ...dataViewToUpdate.toSpec(false),
    version: undefined,
    id: undefined,
  });
  const updatedFilters = updateFilterReferences(prevFilters, dataViewToUpdate.id!, newDataView.id!);

  const redirectUrlParams: DiscoverAppLocatorParams = {
    dataViewSpec: newDataView.toSpec(false),
    filters: updatedFilters,
    query: searchSource.getField('query'),
    timeRange: { from: dateStart, to: dateEnd },
    isAlertResults: true,
  };
  const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams);
  const [start, end] = redirectUrl.split('/app');

  return start + spacePrefix + '/app' + end;
}

function updateFilterReferences(filters: Filter[], fromDataView: string, toDataView: string) {
  return filters.map((filter) => {
    if (filter.meta.index === fromDataView) {
      return {
        ...filter,
        meta: {
          ...filter.meta,
          index: toDataView,
        },
      };
    } else {
      return filter;
    }
  });
}
