/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScheduledTaskParams } from '../../types';

export type RawValue = string | object | null | undefined;

interface DocValueField {
  field: string;
  format: string;
}

interface SortOptions {
  order: string;
  unmapped_type: string;
}

export interface IndexPatternSavedObject {
  title: string;
  timeFieldName: string;
  fields?: any[];
  attributes: {
    fields: string;
    fieldFormatMap: string;
  };
}

export interface JobParamsDiscoverCsv {
  browserTimezone: string;
  indexPatternId: string;
  objectType: string;
  title: string;
  searchRequest: SearchRequest;
  fields: string[];
  metaFields: string[];
  conflictedTypesFields: string[];
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
