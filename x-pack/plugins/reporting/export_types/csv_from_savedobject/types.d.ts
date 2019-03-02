/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SavedObjectServiceError {
  statusCode: number;
  error?: string;
  message?: string;
}

export interface SavedObjectMeta {
  searchSourceJSON?: string;
  searchSource?: any;
}

export interface VisObjectAttributes {
  title: string;
  visState: string;
  uiStateJSON: string;
}

export interface SavedSearchObjectAttributes {
  title: string;
  sort: any[];
  columns: string[];
  kibanaSavedObjectMeta: SavedObjectMeta;
  uiState: any;
}

export interface SavedVisState {
  title: string;
  type: string;
  params: any;
  uiState: any;
  aggs: any[];
  sort: any[];
  kibanaSavedObjectMeta: SavedObjectMeta;
}

export interface SavedObjectReference {
  name: string; // should be kibanaSavedObjectMeta.searchSourceJSON.index
  type: string; // should be index-pattern
  id: string;
}

export interface SavedObject {
  attributes: any;
  references: SavedObjectReference[];
}

export interface TimeRangeParams {
  timezone: string;
  min: Date;
  max: Date;
}

export interface IndexPatternSavedObject {
  title: string;
  timeFieldName: string;
  fields: any[];
  fieldFormatMap: {
    [key: string]: { id: string; params: { pattern: string } };
  };
}

export interface VisPanel {
  indexPatternSavedObject: any;
  attributes: SavedSearchObjectAttributes | SavedVisState;
  references: SavedObjectReference[];
  timerange: TimeRangeParams;
}

export interface SearchPanel {
  indexPatternSavedObjectId: string;
  attributes: SavedSearchObjectAttributes | SavedVisState;
  timerange: TimeRangeParams;
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
