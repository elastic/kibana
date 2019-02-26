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
  description: string;
  version: number;
}

export interface SavedSearchObjectAttributes {
  title: string;
  uiStateJSON: string;
  description: string;
  sort: any[];
  columns: string[];
  version: number;
  kibanaSavedObjectMeta: SavedObjectMeta;
}

export interface SavedObjectReference {
  name: string; // should be kibanaSavedObjectMeta.searchSourceJSON.index
  type: string; // should be index-pattern
  id: string;
}

export interface SavedObject {
  attributes: VisObjectAttributes | SavedSearchObjectAttributes;
  references?: SavedObjectReference[];
}

export interface TsvbPanel {
  filter: string;
  id: string;
  index_pattern: string;
  pivot_id: string;
  pivot_label: string;
  pivot_rows: number;
  interval: string;
  series: Array<{
    formatter: string;
    id: string;
    metrics: Array<{
      field: string;
      id: string;
      type: string;
    }>;
  }>;
  type: string; // e.g 'table' for TSVB Table,
  timerange: TimeRangeParams; // throw-on
}

interface TsvbAggregationCell {
  label: string;
  last: number;
  slope?: number;
  data?: [number, number]; // timestamp & metric
}

interface TsvbAggregationRow {
  key: string;
  series: TsvbAggregationCell[];
}

export interface TsvbTableData {
  type: string;
  series: TsvbAggregationRow[];
}

export interface VisState {
  aggs: any[]; // unused?
  params?: TsvbPanel;
  title: string;
  type: string; // e.g 'metrics' for TSVB
}

export interface TimeRangeParams {
  timezone: string;
  min: Date;
  max: Date;
}

export interface SearchPanel {
  indexPatternSavedObject: any;
  attributes: VisObjectAttributes | SavedSearchObjectAttributes;
  references: SavedObjectReference[];
  timerange: TimeRangeParams;
}

export interface SearchRequest {
  index: string;
  body:
    | {
        stored_fields: string[];
      }
    | any;
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
  script_fields: string[];
  _source: {
    excludes: string[];
    includes: string[];
  };
  docvalue_fields: string[];
  sort: Array<{
    [key: string]: {
      order: string;
    };
  }>;
}
