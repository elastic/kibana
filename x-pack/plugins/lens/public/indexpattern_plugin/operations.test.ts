/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOperationTypesForField, getPotentialColumns, getColumnOrder } from './operations';
import { IndexPatternPrivateState } from './indexpattern';

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
};

describe('getOperationTypesForField', () => {
  describe('with aggregatable fields', () => {
    it('should return operations on strings', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['value', 'terms']));
    });

    it('should return operations on numbers', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['value', 'avg', 'sum', 'min', 'max']));
    });

    it('should return operations on dates', () => {
      expect(
        getOperationTypesForField({
          type: 'date',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['value', 'date_histogram']));
    });

    it('should return no operations on unknown types', () => {
      expect(
        getOperationTypesForField({
          type: '_source',
          name: 'a',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual([]);
    });
  });

  describe('with restrictions', () => {
    it('should return operations on strings', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['terms']));
    });

    it('should return operations on numbers', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            min: {
              agg: 'min',
            },
            max: {
              agg: 'max',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['min', 'max']));
    });

    it('should return operations on dates', () => {
      expect(
        getOperationTypesForField({
          type: 'dates',
          name: 'a',
          aggregatable: true,
          searchable: true,
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              fixed_interval: '60m',
              delay: '1d',
              time_zone: 'UTC',
            },
          },
        })
      ).toEqual(expect.arrayContaining(['date_histogram']));
    });
  });

  describe('getPotentialColumns', () => {
    let state: IndexPatternPrivateState;

    beforeEach(() => {
      state = {
        indexPatterns: expectedIndexPatterns,
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Value of timestamp',
            dataType: 'date',
            isBucketed: false,

            // Private
            operationType: 'value',
            sourceField: 'timestamp',
          },
        },
      };
    });

    it('should include priority', () => {
      const columns = getPotentialColumns(state, 1);

      expect(columns.every(col => col.suggestedOrder === 1)).toEqual(true);
    });

    it('should list operations by field for a regular index pattern', () => {
      const columns = getPotentialColumns(state);

      expect(columns.map(col => [col.sourceField, col.operationType])).toMatchInlineSnapshot(`
Array [
  Array [
    "bytes",
    "value",
  ],
  Array [
    "bytes",
    "sum",
  ],
  Array [
    "bytes",
    "avg",
  ],
  Array [
    "bytes",
    "min",
  ],
  Array [
    "bytes",
    "max",
  ],
  Array [
    "documents",
    "count",
  ],
  Array [
    "source",
    "value",
  ],
  Array [
    "source",
    "terms",
  ],
  Array [
    "timestamp",
    "value",
  ],
  Array [
    "timestamp",
    "date_histogram",
  ],
]
`);
    });
  });
});

describe('getColumnOrder', () => {
  it('should work for empty columns', () => {
    expect(getColumnOrder({})).toEqual([]);
  });

  it('should work for one column', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Value of timestamp',
          dataType: 'string',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
      })
    ).toEqual(['col1']);
  });

  it('should put any number of aggregations before metrics', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Top Values of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
        },
        col2: {
          operationId: 'op2',
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'bytes',
        },
        col3: {
          operationId: 'op3',
          label: 'Date Histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          sourceField: 'timestamp',
        },
      })
    ).toEqual(['col1', 'col3', 'col2']);
  });

  it('should reorder aggregations based on suggested priority', () => {
    expect(
      getColumnOrder({
        col1: {
          operationId: 'op1',
          label: 'Top Values of category',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'value',
          sourceField: 'timestamp',
          suggestedOrder: 2,
        },
        col2: {
          operationId: 'op2',
          label: 'Average of bytes',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'value',
          sourceField: 'bytes',
          suggestedOrder: 0,
        },
        col3: {
          operationId: 'op3',
          label: 'Date Histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          sourceField: 'timestamp',
          suggestedOrder: 1,
        },
      })
    ).toEqual(['col3', 'col1', 'col2']);
  });
});
