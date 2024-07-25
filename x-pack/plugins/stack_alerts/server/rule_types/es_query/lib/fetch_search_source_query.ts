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
  dateStart: string;
  dateEnd: string;
}

export async function fetchSearchSourceQuery({
  ruleId,
  alertLimit,
  params,
  latestTimestamp,
  spacePrefix,
  services,
  dateStart,
  dateEnd,
}: FetchSearchSourceQueryOpts) {
  const { logger, searchSourceClient } = services;
  const isGroupAgg = isGroupAggregation(params.termField);
  const isCountAgg = isCountAggregation(params.aggType);
  const initialSearchSource = await searchSourceClient.createLazy(params.searchConfiguration);

  const index = initialSearchSource.getField('index') as DataView;
  const { searchSource, filterToExcludeHitsFromPreviousRun } = await updateSearchSource(
    initialSearchSource,
    index,
    params,
    latestTimestamp,
    dateStart,
    dateEnd,
    alertLimit
  );

  const searchRequestBody: unknown = searchSource.getSearchRequestBody();
  logger.debug(
    () => `search source query rule (${ruleId}) query: ${JSON.stringify(searchRequestBody)}`
  );

  const searchResult = await searchSource.fetch();

  const link = await generateLink(
    initialSearchSource,
    services.share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!,
    services.dataViews,
    index,
    dateStart,
    dateEnd,
    spacePrefix,
    filterToExcludeHitsFromPreviousRun
  );
  return {
    link,
    numMatches: Number(searchResult.hits.total),
    searchResult,
    parsedResults: parseAggregationResults({
      isCountAgg,
      isGroupAgg,
      esResult: searchResult,
      sourceFieldsParams: params.sourceFields,
    }),
    index: [index.name],
    query: searchRequestBody,
  };
}

export async function updateSearchSource(
  searchSource: ISearchSource,
  index: DataView,
  params: OnlySearchSourceRuleParams,
  latestTimestamp: string | undefined,
  dateStart: string,
  dateEnd: string,
  alertLimit?: number
): Promise<{ searchSource: ISearchSource; filterToExcludeHitsFromPreviousRun: Filter | null }> {
  const isGroupAgg = isGroupAggregation(params.termField);
  const timeField = await index.getTimeField();

  if (!timeField) {
    throw new Error(`Data view with ID ${index.id} no longer contains a time field.`);
  }

  searchSource.setField('size', isGroupAgg ? 0 : params.size);

  const filters = [
    buildRangeFilter(
      timeField,
      { lte: dateEnd, gte: dateStart, format: 'strict_date_optional_time' },
      index
    ),
  ];

  let filterToExcludeHitsFromPreviousRun = null;
  if (params.excludeHitsFromPreviousRun) {
    if (latestTimestamp && latestTimestamp > dateStart) {
      // add additional filter for documents with a timestamp greater than
      // the timestamp of the previous run, so that those documents are not counted twice
      filterToExcludeHitsFromPreviousRun = buildRangeFilter(
        timeField,
        { gt: latestTimestamp, format: 'strict_date_optional_time' },
        index
      );
      filters.push(filterToExcludeHitsFromPreviousRun);
    }
  }

  const searchSourceChild = searchSource.createChild();
  if (!isGroupAgg) {
    searchSourceChild.setField('trackTotalHits', true);
  }
  searchSourceChild.setField('filter', filters as Filter[]);
  searchSourceChild.setField('sort', [
    {
      [timeField.name]: {
        order: SortDirection.desc,
        format: 'strict_date_optional_time||epoch_millis',
      },
    },
  ]);
  searchSourceChild.setField(
    'aggs',
    buildAggregation({
      aggType: params.aggType,
      aggField: params.aggField,
      termField: params.termField,
      termSize: params.termSize,
      sourceFieldsParams: params.sourceFields,
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
    filterToExcludeHitsFromPreviousRun,
  };
}

export async function generateLink(
  searchSource: ISearchSource,
  discoverLocator: LocatorPublic<DiscoverAppLocatorParams>,
  dataViews: DataViewsContract,
  dataViewToUpdate: DataView,
  dateStart: string,
  dateEnd: string,
  spacePrefix: string,
  filterToExcludeHitsFromPreviousRun: Filter | null
) {
  const prevFilters = [...((searchSource.getField('filter') as Filter[]) || [])];

  if (filterToExcludeHitsFromPreviousRun) {
    // Using the same additional filter as in the alert check above.
    // We cannot simply pass `latestTimestamp` to `timeRange.from` Discover locator params
    // as that would include `latestTimestamp` itself in the Discover results which would be wrong.
    // Results should be after `latestTimestamp` and within `dateStart` and `dateEnd`.
    prevFilters.push(filterToExcludeHitsFromPreviousRun);
  }

  // make new adhoc data view
  const newDataView = await dataViews.create(
    {
      ...dataViewToUpdate.toSpec(false),
      version: undefined,
      id: undefined,
    },
    true
  );
  const updatedFilters = updateFilterReferences(prevFilters, dataViewToUpdate.id!, newDataView.id!);

  const redirectUrlParams: DiscoverAppLocatorParams = {
    dataViewSpec: getSmallerDataViewSpec(newDataView),
    filters: updatedFilters,
    query: searchSource.getField('query'),
    timeRange: { from: dateStart, to: dateEnd },
    isAlertResults: true,
  };

  // use `lzCompress` flag for making the link readable during debugging/testing
  // const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { lzCompress: false });
  const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams);
  const [start, end] = redirectUrl.split('/app');

  return start + spacePrefix + '/app' + end;
}

export function updateFilterReferences(
  filters: Filter[],
  fromDataView: string,
  toDataView: string | undefined
) {
  return (filters || []).map((filter) => {
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

export function getSmallerDataViewSpec(
  dataView: DataView
): DiscoverAppLocatorParams['dataViewSpec'] {
  return dataView.toMinimalSpec({ keepFieldAttrs: ['customLabel'] });
}
