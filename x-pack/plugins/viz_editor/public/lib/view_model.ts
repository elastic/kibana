/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface IndexPatternField {
  name: string;
  type: string;
  aggregatable: boolean;
}

export interface IndexPattern {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: IndexPatternField[];
}

export interface DateHistogramOperation {
  op: 'date_histogram';
  arg: {
    field: string;
    interval: string;
  };
}

export interface SumOperation {
  op: 'sum';
  arg: string;
}

export type QueryColumn = DateHistogramOperation | SumOperation;

export interface QueryViewModel {
  indexPattern: string;
  select: {
    [id: string]: QueryColumn;
  };
}

export interface Axis {
  title: string;
  columns: string[];
}

export interface IndexPatterns {
  [id: string]: IndexPattern;
}

export interface ViewModel {
  indexPatterns: IndexPatterns;
  queries: {
    [id: string]: QueryViewModel;
  };
  visualizationType: string;
  title: string;
  [key: string]: any;
}

export function selectColumn(id: string, model: ViewModel) {
  const [queryId] = id.split('_');
  const query = model.queries[queryId];

  return query ? query.select[id] : undefined;
}

// Generate our dummy-data
export function initialState(): ViewModel {
  return {
    indexPatterns: {
      'index-pattern:aaa': {
        id: 'index-pattern:aaa',
        title: 'kibana_sample_data_ecommerce',
        timeFieldName: '@timestamp',
        fields: [
          {
            name: '@timestamp',
            type: 'date',
            aggregatable: true,
          },
          {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
          },
        ],
      },
    },
    queries: {
      q1: {
        indexPattern: 'index-pattern:aaa',
        select: {
          q1_0: { op: 'date_histogram', arg: { field: '@timestamp', interval: '30s' } },
          q1_1: { op: 'sum', arg: 'bytes' },
        },
      },
    },
    visualizationType: 'bar_chart',
    title: 'Sum of bytes over time',
    xAxis: {
      title: 'Sum of bytes',
      columns: ['q1_0'],
    },
    yAxis: {
      title: 'Timestamp per 30 seconds',
      columns: ['q1_1'],
    },
  };
}
