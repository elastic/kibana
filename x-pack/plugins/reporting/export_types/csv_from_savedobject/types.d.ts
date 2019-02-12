/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface JobParams {
  savedObjectType: string;
  savedObjectId: string;
  immediate: boolean;
}

export interface SavedObjectServiceError {
  statusCode: number;
  error?: string;
  message?: string;
}

export interface SavedObject {
  attributes: {
    title: string;
    visState: string;
    uiStateJSON: string;
    description: string;
    version: 1;
    kibanaSavedObjectMeta: {
      searchSourceJSON: string;
    };
  };
}

export interface TsvbPanel {
  filter: string;
  id: string;
  index_pattern: string;
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
}

interface TsvbAggregationCell {
  label: string;
  last: number;
  slope: number;
  data: number;
}

interface TsvbAggregationRow {
  key: string;
  series: TsvbAggregationCell[];
}

export interface TsvbTableData {
  type: 'table';
  series: TsvbAggregationRow[];
}

export interface VisState {
  aggs: any[]; // unused?
  params?: TsvbPanel | TimelionPanel;
  title: string;
  type: string; // e.g 'metrics' for TSVB
}

export interface TimelionPanel {
  expression: string;
  interval: string;
}
