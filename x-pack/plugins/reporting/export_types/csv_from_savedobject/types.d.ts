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

export interface SavedObjectMetaJSON {
  searchSourceJSON: string;
}

export interface SavedObjectMeta {
  searchSource: SearchSource;
}

export interface SavedSearchObjectAttributesJSON {
  title: string;
  sort: any[];
  columns: string[];
  kibanaSavedObjectMeta: SavedObjectMetaJSON;
  uiState: any;
}

export interface SavedSearchObjectAttributes {
  title: string;
  sort: any[];
  columns: string[];
  kibanaSavedObjectMeta: SavedObjectMeta;
  uiState: any;
}

export interface VisObjectAttributesJSON {
  title: string;
  visState: string; // JSON string
  type: string;
  params: any;
  uiStateJSON: string; // also JSON string
  aggs: any[];
  sort: any[];
  kibanaSavedObjectMeta: SavedObjectMeta;
}

export interface VisObjectAttributes {
  title: string;
  visState: string; // JSON string
  type: string;
  params: any;
  uiState: {
    vis: {
      params: {
        sort: {
          columnIndex: string;
          direction: string;
        };
      };
    };
  };
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

export interface IndexPatternSavedObject {
  title: string;
  timeFieldName: string;
  fields: any[];
  fieldFormatMap: {
    [key: string]: { id: string; params: { pattern: string } };
  };
}

export interface TimeRangeParams {
  timezone: string;
  min: Date;
  max: Date;
}

export interface VisPanel {
  indexPatternSavedObjectId?: string;
  savedSearchObjectId?: string;
  attributes: VisObjectAttributes;
  timerange: TimeRangeParams;
}

export interface SearchPanel {
  indexPatternSavedObjectId: string;
  attributes: SavedSearchObjectAttributes;
  timerange: TimeRangeParams;
}

export interface SearchSource {
  query: any;
  filter: any[];
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
