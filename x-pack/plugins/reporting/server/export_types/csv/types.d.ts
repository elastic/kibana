/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseParams, BasePayload } from '../../types';

export type RawValue = string | object | null | undefined;

export interface IndexPatternSavedObjectDeprecatedCSV {
  title: string;
  timeFieldName: string;
  fields?: any[];
  attributes: {
    fields: string;
    fieldFormatMap: string;
  };
}

interface BaseParamsDeprecatedCSV {
  searchRequest: SearchRequestDeprecatedCSV;
  fields: string[];
  metaFields: string[];
  conflictedTypesFields: string[];
}

export type JobParamsDeprecatedCSV = BaseParamsDeprecatedCSV &
  BaseParams & {
    indexPatternId: string;
  };

// CSV create job method converts indexPatternID to indexPatternSavedObject
export type TaskPayloadDeprecatedCSV = BaseParamsDeprecatedCSV &
  BasePayload & {
    indexPatternSavedObject: IndexPatternSavedObjectDeprecatedCSV;
  };

export interface SearchRequestDeprecatedCSV {
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

type FormatsMapDeprecatedCSV = Map<
  string,
  {
    id: string;
    params: {
      pattern: string;
    };
  }
>;

export interface SavedSearchGeneratorResultDeprecatedCSV {
  maxSizeReached: boolean;
  csvContainsFormulas?: boolean;
  warnings: string[];
}
