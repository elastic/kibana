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

interface CsvResult {
  type: string;
  rows: string[] | null;
}

interface GenerateCsvParams {
  searchRequest: SearchRequest;

  fields: string[];
  formatsMap: any;
  metaFields: string[];
  conflictedTypesFields: string[];
  callEndpoint: any;
  cancellationToken: any;
  settings: {
    separator: string;
    quoteValues: boolean;
    timezone: string;
    maxSizeBytes: number;
    scroll: {
      duration: string;
      size: number;
    };
  };
}

export async function generateCsvSearch(
  req: Request,
  server: KbnServer,
  logger: Logger,
  searchPanel: SearchPanel
): Promise<CsvResult> {
  // get job params to main csv export module

  const generateCsv = createGenerateCsv(logger);

  // searchPanel;
  // debugger;

  const savedSearchObjectAttr = searchPanel.attributes as SavedSearchObjectAttributes;
  const [sortField, sortOrder] = savedSearchObjectAttr.sort;

  const params: GenerateCsvParams = {
    searchRequest: {
      index: searchPanel.indexPatternSavedObject.title,
      body: {
        stored_fields: [searchPanel.indexPatternSavedObject.timeFieldName],
      },
      query: {
        bool: {
          must: [{ match_all: {} }, { range: {} }],
        },
      },
      script_fields: [],
      _source: {
        includes: [],
        excludes: [],
      },
      docvalue_fields: [],
      sort: [{ [sortField]: { order: sortOrder } }],
    },
    fields: [searchPanel.indexPatternSavedObject.timeFieldName],
    formatsMap: [],
    metaFields: [],
    conflictedTypesFields: [],
    callEndpoint: [],
    cancellationToken: [],
    settings: {
      separator: ',',
      quoteValues: true,
      timezone: 'UTC',
      maxSizeBytes: 10485760,
      scroll: {
        duration: '30s',
        size: 500,
      },
    },
  };

  return {
    type: 'CSV from Saved Search',
    rows: generateCsv(params),
  };
}
