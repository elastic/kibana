/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, getIndexPatternFromESQLQuery } from '@kbn/es-query';
import { DataView, DataViewsContract, getTime } from '@kbn/data-plugin/common';
import { parseAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { OnlyEsqlQueryRuleParams } from '../types';
import { getSmallerDataViewSpec } from './fetch_search_source_query';
import { EsqlTable, toEsQueryHits } from '../../../../common';

export interface FetchEsqlQueryOpts {
  ruleId: string;
  alertLimit: number | undefined;
  params: OnlyEsqlQueryRuleParams;
  spacePrefix: string;
  services: {
    logger: Logger;
    scopedClusterClient: IScopedClusterClient;
    share: SharePluginStart;
    dataViews: DataViewsContract;
  };
}

export async function fetchEsqlQuery({
  ruleId,
  alertLimit,
  params,
  services,
  spacePrefix,
}: FetchEsqlQueryOpts) {
  const { logger, scopedClusterClient, dataViews } = services;
  const esClient = scopedClusterClient.asCurrentUser;

  const indexPatternRefs = await dataViews.getIdsWithTitle();
  const indexPattern = getIndexPatternFromESQLQuery(params.esqlQuery.esql);
  const dataViewId = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
  const dataView = await dataViews.get(dataViewId);

  const { query, dateStart, dateEnd } = getEsqlQuery(dataView, params, alertLimit);

  logger.debug(`ESQL query rule (${ruleId}) query: ${JSON.stringify(query)}`);

  const response = await esClient.transport.request<EsqlTable>({
    method: 'POST',
    path: '/_esql',
    body: query,
  });

  const link = await generateLink(
    params.esqlQuery,
    response.columns.map((c) => c.name),
    services.share.url.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR')!,
    services.dataViews,
    dataView,
    dateStart,
    dateEnd,
    spacePrefix
  );

  return {
    link,
    numMatches: Number(2),
    parsedResults: parseAggregationResults({
      isCountAgg: true,
      isGroupAgg: false,
      esResult: {
        took: 0,
        timed_out: false,
        _shards: { failed: 0, successful: 0, total: 0 },
        hits: toEsQueryHits(response),
      },
      resultLimit: alertLimit,
    }),
    dateStart,
    dateEnd,
  };
}

export const getEsqlQuery = (
  index: DataView,
  params: OnlyEsqlQueryRuleParams,
  alertLimit?: number
) => {
  const timeFieldName = index.timeFieldName;

  if (!timeFieldName) {
    throw new Error('Invalid data view without timeFieldName.');
  }

  const timeRange = {
    from: `now-${params.timeWindowSize}${params.timeWindowUnit}`,
    to: 'now',
  };
  const timerangeFilter = getTime(index, timeRange);
  const dateStart = timerangeFilter?.query.range[timeFieldName].gte;
  const dateEnd = timerangeFilter?.query.range[timeFieldName].lte;
  const rangeFilter: unknown[] = [
    {
      range: {
        [timeFieldName]: {
          lte: dateEnd,
          gte: dateStart,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const query = {
    query: alertLimit ? `${params.esqlQuery.esql} | limit ${alertLimit}` : params.esqlQuery.esql,
    filter: {
      bool: {
        filter: rangeFilter,
      },
    },
  };
  return {
    query,
    dateStart,
    dateEnd,
  };
};

export const generateLink = async (
  query: AggregateQuery,
  columns: string[],
  discoverLocator: LocatorPublic<DiscoverAppLocatorParams>,
  dataViews: DataViewsContract,
  dataViewToUpdate: DataView,
  dateStart: string,
  dateEnd: string,
  spacePrefix: string
) => {
  // make new adhoc data view
  const newDataView = await dataViews.create({
    ...dataViewToUpdate.toSpec(false),
    version: undefined,
    id: undefined,
  });

  const redirectUrlParams: DiscoverAppLocatorParams = {
    dataViewSpec: getSmallerDataViewSpec(newDataView),
    query,
    timeRange: { from: dateStart, to: dateEnd },
    isAlertResults: true,
    columns,
  };

  // use `lzCompress` flag for making the link readable during debugging/testing
  // const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams, { lzCompress: false });
  const redirectUrl = discoverLocator!.getRedirectUrl(redirectUrlParams);
  const [start, end] = redirectUrl.split('/app');

  return start + spacePrefix + '/app' + end;
};
