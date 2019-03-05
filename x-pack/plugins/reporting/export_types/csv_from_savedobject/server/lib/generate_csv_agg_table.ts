/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { buildEsQuery } from '@kbn/es-query';
import { Request } from 'hapi';
import moment from 'moment';
// @ts-ignore
import { fieldFormatMapFactory } from '../../../csv/server/lib/field_format_map';
import { KbnServer, Logger } from '../../../../types';
import { SearchRequest, VisObjectAttributes, VisPanel } from '../../types';
import { getDataSource } from './get_data_source';
// @ts-ignore
import { AggConfig, tabifyAggResponse } from './tabify';

const JOB_DATA_TYPE = 'CSV from aggregated table visualization';

interface AggTableGeneratorResult {
  content: string;
}

interface CsvResultFromAggTable {
  type: string;
  result: AggTableGeneratorResult | null;
}

const getEsQueryConfig = async (config: any) => {
  const configs = await Promise.all([
    config.get('query:allowLeadingWildcards'),
    config.get('query:queryString:options'),
    config.get('courier:ignoreFilterIfFieldNotInIndex'),
  ]);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] = configs;
  return { allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex };
};

export async function generateCsvAggTable(
  req: Request,
  server: KbnServer,
  logger: Logger,
  tablePanel: VisPanel
): Promise<CsvResultFromAggTable> {
  const { savedObjects, uiSettingsServiceFactory, fieldFormatServiceFactory } = server;
  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(req);
  const { indexPatternSavedObjectId, savedSearchObjectId, timerange } = tablePanel;

  const visObjectAttr = tablePanel.attributes as VisObjectAttributes;

  const { indexPatternSavedObject, searchSource: searchFromDataSource } = await getDataSource(
    savedObjectsClient,
    indexPatternSavedObjectId,
    savedSearchObjectId
  );

  const timeFilter = {
    range: {
      [indexPatternSavedObject.timeFieldName]: {
        format: 'epoch_millis',
        gte: moment(timerange.min).valueOf(),
        lte: moment(timerange.max).valueOf(),
      },
    },
  };

  const uiConfig = uiSettingsServiceFactory({ savedObjectsClient });
  const fieldFormats = await fieldFormatServiceFactory(uiConfig);

  const { filter: searchSourceFilter, query: searchSourceQuery } = searchFromDataSource!;
  const esQueryConfig = await getEsQueryConfig(uiConfig);
  const combinedFilter = [timeFilter].concat(searchSourceFilter);
  const searchRequest: SearchRequest = {
    index: indexPatternSavedObject.title,
    body: {
      size: 0,
      query: buildEsQuery(
        indexPatternSavedObject,
        searchSourceQuery,
        combinedFilter,
        esQueryConfig
      ),
      aggs: { '3': { aggs: { '2': { aggs: { '1': { sum: { field: 'value', }, }, }, terms: { field: 'name', order: { '1': 'desc', }, size: 1000, }, }, }, histogram: { field: 'year', interval: 1, min_doc_count: 1, }, }, },
    },
  };

  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: any[]) => callWithRequest(req, ...params);
  const esResponse = await callCluster('search', searchRequest);

  // build the agg results into a table
  const opts = {};
  const aggConfig = new AggConfig(visObjectAttr.aggs, fieldFormats, opts);
  const result = tabifyAggResponse(aggConfig, esResponse);

  return {
    type: JOB_DATA_TYPE,
    result: {
      content: JSON.stringify(result),
    },
  };
}
