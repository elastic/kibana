/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseParams, BasePayload } from '../base';

export type RawValue = string | object | null | undefined;

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

export type TaskPayloadDeprecatedCSV = BaseParamsDeprecatedCSV &
  BasePayload & {
    indexPatternId: string;
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

export interface SavedSearchGeneratorResultDeprecatedCSV {
  maxSizeReached: boolean;
  csvContainsFormulas?: boolean;
  warnings: string[];
}
