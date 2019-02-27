/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { KbnServer, Logger } from '../../../../types';
// @ts-ignore
import { createGenerateCsv } from '../../../csv/server/lib/generate_csv';
import { SavedSearchObjectAttributes, SearchPanel, SearchRequest } from '../../types';

interface GeneratorResult {
  content: string;
  maxSizeReached: boolean;
  size: number;
}

interface CsvResultFromSearch {
  type: string;
  result: GeneratorResult;
}

type EndpointCaller = (method: string, params: any) => Promise<any>;

interface GenerateCsvParams {
  searchRequest: SearchRequest;
  fields: string[];
  formatsMap: any;
  metaFields: string[];
  conflictedTypesFields: string[];
  callEndpoint: EndpointCaller;
  cancellationToken: any;
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
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const callCluster = (...params: any[]) => {
    return callWithRequest(req, ...params);
  };
  const csvSettings = {
    separator: ',',
    quoteValues: true,
    timezone: 'UTC',
    maxSizeBytes: 10485760,
    scroll: { duration: '30s', size: 500 },
  };

  const indexPatternSavedObject = searchPanel.indexPatternSavedObject;
  const savedSearchObjectAttr = searchPanel.attributes as SavedSearchObjectAttributes;
  const [sortField, sortOrder] = savedSearchObjectAttr.sort;
  const generateCsvParams: GenerateCsvParams = {
    searchRequest: {
      index: indexPatternSavedObject.title,
      body: { stored_fields: [indexPatternSavedObject.timeFieldName] },
      query: { bool: { must: [{ match_all: {} }, { range: searchPanel.timerange }] } },
      script_fields: [],
      _source: { includes: [], excludes: [] },
      docvalue_fields: [],
      sort: [{ [sortField]: { order: sortOrder } }],
    },
    fields: [indexPatternSavedObject.timeFieldName, ...savedSearchObjectAttr.columns],
    formatsMap: [],
    metaFields: [],
    conflictedTypesFields: [],
    cancellationToken: [],
    callEndpoint: callCluster,
    settings: csvSettings,
  };

  const generateCsv = createGenerateCsv(logger);
  return {
    type: 'CSV from Saved Search',
    result: await generateCsv(generateCsvParams),
  };
}
