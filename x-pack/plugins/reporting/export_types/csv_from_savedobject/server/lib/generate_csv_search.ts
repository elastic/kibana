/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import moment from 'moment';
import { KbnServer, Logger } from '../../../../types';
// @ts-ignore
import { fieldFormatMapFactory } from '../../../csv/server/lib/field_format_map';
// @ts-ignore
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';
import { SavedSearchObjectAttributes, SearchPanel, SearchRequest } from '../../types';

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
type FormatsMap = Map<string, any>;

interface GenerateCsvParams {
  searchRequest: SearchRequest;
  callEndpoint: EndpointCaller;
  fields: string[];
  formatsMap: FormatsMap;
  metaFields: string[]; // FIXME not sure what this is for
  conflictedTypesFields: string[]; // FIXME not sure what this is for
  cancellationToken: any; // FIXME not sure how to do anything with this
  settings: {
    separator: string;
    quoteValues: boolean;
    timezone: string;
    maxSizeBytes: number;
    scroll: { duration: string; size: number };
  };
}

export async function generateCsvSearch(
  req: Request,
  server: KbnServer,
  logger: Logger,
  searchPanel: SearchPanel
): Promise<CsvResultFromSearch> {
  const { savedObjects, uiSettingsServiceFactory, fieldFormatServiceFactory } = server;

  const savedObjectsClient = savedObjects.getScopedSavedObjectsClient(req);
  const uiConfig = uiSettingsServiceFactory({ savedObjectsClient });
  const { indexPatternSavedObject, timerange } = searchPanel;

  const [formatsMap, uiSettings] = await Promise.all([
    (async () => {
      const fieldFormats = await fieldFormatServiceFactory(uiConfig);
      return fieldFormatMapFactory(indexPatternSavedObject, fieldFormats);
    })(),
    (async () => {
      const [separator, quoteValues] = await Promise.all([
        uiConfig.get('csv:separator'),
        uiConfig.get('csv:quoteValues'),
      ]);

      return {
        quoteValues: !!quoteValues,
        separator,
      };
    })(),
  ]);

  const savedSearchObjectAttr = searchPanel.attributes as SavedSearchObjectAttributes;
  const [sortField, sortOrder] = savedSearchObjectAttr.sort;
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: any[]) => callWithRequest(req, ...params);
  const config = server.config();
  const searchRequest: SearchRequest = {
    index: indexPatternSavedObject.title,
    body: {
      _source: {
        includes: [indexPatternSavedObject.timeFieldName, ...savedSearchObjectAttr.columns],
      },
      docvalue_fields: [],
      query: {
        bool: {
          filter: [],
          must_not: [],
          should: [],
          must: [
            { match_all: {} },
            {
              range: {
                [indexPatternSavedObject.timeFieldName]: {
                  format: 'epoch_millis',
                  gte: moment(timerange.min).valueOf(),
                  lte: moment(timerange.max).valueOf(),
                },
              },
            },
          ],
        },
      },
      script_fields: {},
      sort: [{ [sortField]: { order: sortOrder } }],
    },
  };
  const generateCsvParams: GenerateCsvParams = {
    searchRequest,
    callEndpoint: callCluster,
    fields: [indexPatternSavedObject.timeFieldName, ...savedSearchObjectAttr.columns],
    formatsMap,
    metaFields: [],
    conflictedTypesFields: [],
    cancellationToken: [],
    settings: {
      ...uiSettings,
      timezone: timerange.timezone,
      maxSizeBytes: config.get('xpack.reporting.csv.maxSizeBytes'),
      scroll: config.get('xpack.reporting.csv.scroll'),
    },
  };

  const generateCsv = createGenerateCsv(logger);

  return {
    type: 'CSV from Saved Search',
    result: await generateCsv(generateCsvParams),
  };
}
