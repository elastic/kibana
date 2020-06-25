/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancellationToken } from '../../../common';
import { JobParamPostPayload, ScheduledTaskParams, ScrollConfig } from '../../types';

export type RawValue = string | object | null | undefined;

interface DocValueField {
  field: string;
  format: string;
}

interface SortOptions {
  order: string;
  unmapped_type: string;
}

export interface JobParamPostPayloadDiscoverCsv extends JobParamPostPayload {
  state?: {
    query: any;
    sort: Array<Record<string, SortOptions>>;
    docvalue_fields: DocValueField[];
  };
}

export interface JobParamsDiscoverCsv {
  indexPatternId?: string;
  post?: JobParamPostPayloadDiscoverCsv;
}

export interface ScheduledTaskParamsCSV extends ScheduledTaskParams<JobParamsDiscoverCsv> {
  basePath: string;
  searchRequest: any;
  fields: any;
  indexPatternSavedObject: any;
  metaFields: any;
  conflictedTypesFields: any;
}

export interface SearchRequest {
  index: string;
  body:
    | {
        _source: {
          excludes: string[];
          includes: string[];
        };
        docvalue_fields: string[];
        query:
          | {
              bool: {
                filter: any[];
                must_not: any[];
                should: any[];
                must: any[];
              };
            }
          | any;
        script_fields: any;
        sort: Array<{
          [key: string]: {
            order: string;
          };
        }>;
        stored_fields: string[];
      }
    | any;
}

type EndpointCaller = (method: string, params: any) => Promise<any>;

type FormatsMap = Map<
  string,
  {
    id: string;
    params: {
      pattern: string;
    };
  }
>;

export interface SavedSearchGeneratorResult {
  content: string;
  size: number;
  maxSizeReached: boolean;
  csvContainsFormulas?: boolean;
  warnings: string[];
}

export interface CsvResultFromSearch {
  type: string;
  result: SavedSearchGeneratorResult;
}

export interface GenerateCsvParams {
  searchRequest: SearchRequest;
  callEndpoint: EndpointCaller;
  fields: string[];
  formatsMap: FormatsMap;
  metaFields: string[];
  conflictedTypesFields: string[];
  cancellationToken: CancellationToken;
  settings: {
    separator: string;
    quoteValues: boolean;
    timezone: string | null;
    maxSizeBytes: number;
    scroll: ScrollConfig;
    checkForFormulas?: boolean;
    escapeFormulaValues: boolean;
  };
}
