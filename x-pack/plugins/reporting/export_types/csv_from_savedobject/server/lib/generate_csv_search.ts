/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { buildEsQuery } from '@kbn/es-query';
import { Request } from 'hapi';
import moment from 'moment';
import { KbnServer, Logger } from '../../../../types';
// @ts-ignore
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';
import {
  IndexPatternSavedObject,
  SavedSearchObjectAttributes,
  SearchPanel,
  SearchRequest,
  SearchSource,
  TimeRangeParams,
} from '../../types';
import { getDataSource } from './get_data_source';

interface SavedSearchGeneratorResult {
  content: string;
  maxSizeReached: boolean;
  size: number;
}

interface CsvResultFromSearch {
  type: string;
  result: SavedSearchGeneratorResult | null;
}

type EndpointCaller = (method: string, params: any) => Promise<any>;
type FormatsMap = Map<string, any>; // this is required for generateCsv, but formatting is not done for this API

interface GenerateCsvParams {
  searchRequest: SearchRequest;
  callEndpoint: EndpointCaller;
  formatsMap: FormatsMap,
  fields: string[];
  metaFields: string[]; // FIXME not sure what this is for
  conflictedTypesFields: string[]; // FIXME not sure what this is for
  cancellationToken: any; // FIXME not sure how to do anything with this
  settings: {
    separator: string;
    quoteValues: boolean;
    timezone: string | null;
    maxSizeBytes: number;
    scroll: { duration: string; size: number };
  };
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

const getUiSettings = async (config: any) => {
  const configs = await Promise.all([config.get('csv:separator'), config.get('csv:quoteValues')]);
  const [separator, quoteValues] = configs;
  return { separator, quoteValues };
};

const getTimebasedParts = (
  indexPatternSavedObject: IndexPatternSavedObject,
  timerange: TimeRangeParams,
  savedSearchObjectAttr: SavedSearchObjectAttributes,
  searchSourceFilter: any[]
) => {
  let includes: string[];
  let timeFilter: any | null;
  let timezone: string | null;

  const { timeFieldName: indexPatternTimeField } = indexPatternSavedObject;
  if (indexPatternTimeField) {
    includes = [indexPatternTimeField, ...savedSearchObjectAttr.columns];
    timeFilter = {
      range: {
        [indexPatternTimeField]: {
          format: 'epoch_millis',
          gte: moment(timerange.min).valueOf(),
          lte: moment(timerange.max).valueOf(),
        },
      },
    };
    timezone = timerange.timezone;
  } else {
    includes = savedSearchObjectAttr.columns;
    timeFilter = null;
    timezone = null;
  }

  const combinedFilter = timeFilter ? [timeFilter].concat(searchSourceFilter) : searchSourceFilter;

  return { combinedFilter, includes, timezone };
};

interface IndexPatternField {
  scripted: boolean;
  lang?: string;
  script?: string;
  name: string;
}

export async function generateCsvSearch(
  req: Request,
  server: KbnServer,
  logger: Logger,
  searchPanel: SearchPanel
): Promise<CsvResultFromSearch> {
  const { savedObjects, uiSettingsServiceFactory } = server;
  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(req);
  const { indexPatternSavedObjectId, timerange } = searchPanel;
  const savedSearchObjectAttr = searchPanel.attributes as SavedSearchObjectAttributes;
  const { indexPatternSavedObject } = await getDataSource(
    savedObjectsClient,
    indexPatternSavedObjectId
  );
  const uiConfig = uiSettingsServiceFactory({ savedObjectsClient });

  const kibanaSavedObjectMeta = savedSearchObjectAttr.kibanaSavedObjectMeta;
  const { searchSource } = kibanaSavedObjectMeta as { searchSource: SearchSource };

  const { filter: searchSourceFilter, query: searchSourceQuery } = searchSource;
  const { combinedFilter, includes, timezone } = getTimebasedParts(
    indexPatternSavedObject,
    timerange,
    savedSearchObjectAttr,
    searchSourceFilter
  );
  const esQueryConfig = await getEsQueryConfig(uiConfig);
  const [sortField, sortOrder] = savedSearchObjectAttr.sort;

  const scriptFields = indexPatternSavedObject.fields
    .filter((f: IndexPatternField) => f.scripted)
    .reduce((accum: any, curr: IndexPatternField) => {
      return {
        ...accum,
        [curr.name]: {
          script: {
            source: curr.script,
            lang: curr.lang,
          },
        },
      };
    }, {});
  const { timeFieldName: indexPatternTimeField } = indexPatternSavedObject;
  const docValueFields = indexPatternTimeField ? [indexPatternTimeField] : undefined;
  const searchRequest: SearchRequest = {
    index: indexPatternSavedObject.title,
    body: {
      _source: { includes },
      docvalue_fields: docValueFields,
      query: buildEsQuery(
        indexPatternSavedObject,
        searchSourceQuery,
        combinedFilter,
        esQueryConfig
      ),
      script_fields: scriptFields,
      sort: [{ [sortField]: { order: sortOrder } }],
    },
  };

  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: any[]) => callWithRequest(req, ...params);
  const config = server.config();
  const uiSettings = await getUiSettings(uiConfig);

  const generateCsvParams: GenerateCsvParams = {
    searchRequest,
    callEndpoint: callCluster,
    fields: includes,
    formatsMap: new Map(), // there is no field formatting in this API; this is required for generateCsv
    metaFields: [],
    conflictedTypesFields: [],
    cancellationToken: [],
    settings: {
      ...uiSettings,
      maxSizeBytes: config.get('xpack.reporting.csv.maxSizeBytes'),
      scroll: config.get('xpack.reporting.csv.scroll'),
      timezone,
    },
  };

  const generateCsv = createGenerateCsv(logger);

  return {
    type: 'CSV from Saved Search',
    result: await generateCsv(generateCsvParams),
  };
}
