/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOperationTypesForField, getPotentialColumns, getColumnOrder } from './operations';

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

  describe('with non-standard fields', () => {
    it('should return an empty array for non-aggregatable', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: '_source',
          aggregatable: false,
          searchable: true,
        })
      ).toEqual([]);
    });

    it('should return an empty array for non-searchable', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: '_version',
          aggregatable: true,
          searchable: false,
        })
      ).toEqual([]);
    });
  });

  describe('with aggregation restrictions', () => {
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
    it('should include priority', () => {
      const columns = getPotentialColumns(
        {
          indexPatterns: expectedIndexPatterns,
          currentIndexPatternId: '1',
          columnOrder: [],
          columns: {},
        },
        'col1',
        1
      );

      expect(columns.queriable.every(col => col.suggestedOrder === 1)).toEqual(true);
    });

    it('should list all operations by field when nothing is selected', () => {
      const columns = getPotentialColumns(
        {
          indexPatterns: expectedIndexPatterns,
          currentIndexPatternId: '1',
          columnOrder: [],
          columns: {},
        },
        'col1',
        1
      );

      expect(columns.queriable.map(col => [col.sourceField, col.operationType]))
        .toMatchInlineSnapshot(`
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

  it('should list value queries for a second dimension based on values in first', () => {
    const columns = getPotentialColumns(
      {
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
      },
      'col2'
    );

    expect(columns.queriable.every(col => col.operationType === 'value')).toEqual(true);
  });

  it('should list aggregations for a second dimension once an aggregation is selected on the first', () => {
    const columns = getPotentialColumns(
      {
        indexPatterns: expectedIndexPatterns,
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
          },
        },
      },
      'col2'
    );

    expect(columns.queriable.some(col => col.operationType === 'value')).toEqual(false);
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
