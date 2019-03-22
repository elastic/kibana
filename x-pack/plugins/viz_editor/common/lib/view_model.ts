/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SelectOperation } from './query_types';

export interface IndexPatternField {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface IndexPattern {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: IndexPatternField[];
  fieldFormatMap?: string;
}

export interface QueryViewModel {
  indexPattern: string;
  select: {
    [id: string]: SelectOperation;
  };
}

export interface Axis {
  title: string;
  columns: string[];
}

export interface IndexPatterns {
  [id: string]: IndexPattern;
}

/**
 * The complete state of the editor.
 * The basic properties which are shared over all editor plugins
 * are defined here, anything else is in the private property and scoped by plugin
 */
export interface ViewModel<K extends string = any, T = any> {
  indexPatterns: IndexPatterns | null;
  queries: {
    [id: string]: QueryViewModel;
  };
  editorPlugin: string;
  title: string;
  private: { [key in K]: T };
}

export function selectColumn(id: string, model: ViewModel) {
  const [queryId] = id.split('_');
  const query = model.queries[queryId];

  return query ? query.select[id] : undefined;
}

// Generate our dummy-data
export function initialState(): ViewModel<any, any> {
  return {
    indexPatterns: null,
    queries: {
      q1: {
        indexPattern: 'index-pattern:aaa',
        select: {
          q1_0: { op: 'date_histogram', arg: { field: '@timestamp', interval: '30s' } },
          q1_1: { op: 'sum', arg: 'bytes' },
        },
      },
    },
    editorPlugin: 'bar_chart',
    title: 'Sum of bytes over time',
    private: {
      barChart: {
        xAxis: {
          title: 'Sum of bytes',
          columns: ['q1_0'],
        },
        yAxis: {
          title: 'Timestamp per 30 seconds',
          columns: ['q1_1'],
        },
      },
    },
  };
}
