/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseParams, BasePayload } from '../../types';

export type RawValue = string | object | null | undefined;

export interface IndexPatternSavedObject {
  title: string;
  timeFieldName: string;
  fields?: any[];
  attributes: {
    fields: string;
    fieldFormatMap: string;
  };
}

interface BaseParamsCSV {
  searchRequest: SearchRequest;
  fields: string[];
  metaFields: string[];
  conflictedTypesFields: string[];
}

export type JobParamsCSV = BaseParamsCSV &
  BaseParams & {
    indexPatternId: string;
  };

// CSV create job method converts indexPatternID to indexPatternSavedObject
export type TaskPayloadCSV = BaseParamsCSV &
  BasePayload & {
    indexPatternSavedObject: IndexPatternSavedObject;
  };

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
