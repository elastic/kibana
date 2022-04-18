/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { Query, Filter, TimeRange } from '@kbn/data-plugin/public';
import { Embeddable, EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';

export const createPoint = ({
  field,
  value,
}: {
  field: string;
  value: string | null | number | boolean;
}) => ({
  table: {
    columns: [
      {
        name: field,
        id: '1-1',
        meta: {
          type: 'date' as DatatableColumnType,
          field,
          source: 'esaggs',
          sourceParams: {
            type: 'histogram',
            indexPatternId: 'logstash-*',
            interval: 30,
            otherBucket: true,
          },
        },
      },
    ],
    rows: [
      {
        '1-1': '2048',
      },
    ],
  },
  column: 0,
  row: 0,
  value,
});

export const rowClickData = {
  rowIndex: 1,
  table: {
    type: 'datatable',
    rows: [
      {
        '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
        '6890e417-c5f1-4565-a45c-92f55380e14c': '0',
        '93b8ef16-2483-45b8-ad27-6cc1f790578b': 13,
        'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 0,
        'e0719f1a-04fb-4036-a63c-c25deac3f011': 7,
      },
      {
        '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
        '6890e417-c5f1-4565-a45c-92f55380e14c': '2.25',
        '93b8ef16-2483-45b8-ad27-6cc1f790578b': 3,
        'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 0,
        'e0719f1a-04fb-4036-a63c-c25deac3f011': 2,
      },
      {
        '6ced5344-2596-4545-b626-8b449924e2d4': 'IT',
        '6890e417-c5f1-4565-a45c-92f55380e14c': '0.020939215995129826',
        '93b8ef16-2483-45b8-ad27-6cc1f790578b': 2,
        'b0c5dcc2-4012-4d7e-b983-0e089badc43c': 12.490584373474121,
        'e0719f1a-04fb-4036-a63c-c25deac3f011': 1,
      },
    ],
    columns: [
      {
        id: '6ced5344-2596-4545-b626-8b449924e2d4',
        name: 'Top values of DestCountry',
        meta: {
          type: 'string',
          field: 'DestCountry',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: '(missing value)',
            },
          },
          source: 'esaggs',
        },
      },
      {
        id: '6890e417-c5f1-4565-a45c-92f55380e14c',
        name: 'Top values of FlightTimeHour',
        meta: {
          type: 'string',
          field: 'FlightTimeHour',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'terms',
            params: {
              id: 'string',
              otherBucketLabel: 'Other',
              missingBucketLabel: '(missing value)',
            },
          },
          source: 'esaggs',
        },
      },
      {
        id: '93b8ef16-2483-45b8-ad27-6cc1f790578b',
        name: 'Count of records',
        meta: {
          type: 'number',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'number',
          },
        },
      },
      {
        id: 'b0c5dcc2-4012-4d7e-b983-0e089badc43c',
        name: 'Average of DistanceMiles',
        meta: {
          type: 'number',
          field: 'DistanceMiles',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'number',
          },
        },
      },
      {
        id: 'e0719f1a-04fb-4036-a63c-c25deac3f011',
        name: 'Unique count of OriginAirportID',
        meta: {
          type: 'string',
          field: 'OriginAirportID',
          index: 'kibana_sample_data_flights',
          params: {
            id: 'number',
          },
        },
      },
    ],
  },
  columns: [
    '6ced5344-2596-4545-b626-8b449924e2d4',
    '6890e417-c5f1-4565-a45c-92f55380e14c',
    '93b8ef16-2483-45b8-ad27-6cc1f790578b',
    'b0c5dcc2-4012-4d7e-b983-0e089badc43c',
    'e0719f1a-04fb-4036-a63c-c25deac3f011',
  ],
};

interface TestInput extends EmbeddableInput {
  savedObjectId?: string;
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
}

interface TestOutput extends EmbeddableOutput {
  indexPatterns?: Array<{ id: string }>;
}

export class TestEmbeddable extends Embeddable<TestInput, TestOutput> {
  type = 'test';

  destroy() {}
  reload() {}
}
