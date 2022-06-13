/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOperationTypesForField, getAvailableOperationsByMetadata } from './index';
import { getFieldByNameFactory } from '../pure_helpers';

jest.mock('../loader');

const fields = [
  {
    name: 'timestamp',
    displayName: 'timestamp',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytes',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
];

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    hasRestrictions: false,
    fields,
    getFieldByName: getFieldByNameFactory(fields),
  },
};

describe('getOperationTypesForField', () => {
  describe('with aggregatable fields', () => {
    it('should return operations on strings', () => {
      expect(
        getOperationTypesForField({
          type: 'string',
          name: 'a',
          displayName: 'aLabel',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(['terms', 'unique_count', 'last_value']);
    });

    it('should return only bucketed operations on strings when passed proper filterOperations function', () => {
      expect(
        getOperationTypesForField(
          {
            type: 'string',
            name: 'a',
            displayName: 'aLabel',
            aggregatable: true,
            searchable: true,
          },
          (op) => op.isBucketed
        )
      ).toEqual(['terms']);
    });

    it('should return operations on numbers', () => {
      expect(
        getOperationTypesForField({
          type: 'number',
          name: 'a',
          displayName: 'aLabel',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual([
        'range',
        'terms',
        'median',
        'average',
        'sum',
        'min',
        'max',
        'unique_count',
        'percentile',
        'last_value',
      ]);
    });

    it('should return only metric operations on numbers when passed proper filterOperations function', () => {
      expect(
        getOperationTypesForField(
          {
            type: 'number',
            name: 'a',
            displayName: 'aLabel',
            aggregatable: true,
            searchable: true,
          },
          (op) => !op.isBucketed
        )
      ).toEqual([
        'median',
        'average',
        'sum',
        'min',
        'max',
        'unique_count',
        'percentile',
        'last_value',
      ]);
    });

    it('should return operations on dates', () => {
      expect(
        getOperationTypesForField({
          type: 'date',
          name: 'a',
          displayName: 'aLabel',
          aggregatable: true,
          searchable: true,
        })
      ).toEqual(expect.arrayContaining(['date_histogram']));
    });

    it('should return no operations on unknown types', () => {
      expect(
        getOperationTypesForField({
          type: '_source',
          name: 'a',
          displayName: 'aLabel',
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
          displayName: 'aLabel',
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
          displayName: 'aLabel',
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
          type: 'date',
          name: 'a',
          displayName: 'aLabel',
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

  describe('getAvailableOperationsByMetaData', () => {
    it('should put the median operation first', () => {
      const numberOperation = getAvailableOperationsByMetadata(expectedIndexPatterns[1]).find(
        ({ operationMetaData }) =>
          !operationMetaData.isBucketed && operationMetaData.dataType === 'number'
      )!;
      expect(numberOperation.operations[0]).toEqual(
        expect.objectContaining({
          operationType: 'median',
        })
      );
    });

    it('should list out all operation tuples', () => {
      expect(getAvailableOperationsByMetadata(expectedIndexPatterns[1])).toMatchInlineSnapshot(`
        Array [
          Object {
            "operationMetaData": Object {
              "dataType": "date",
              "isBucketed": true,
              "scale": "interval",
            },
            "operations": Array [
              Object {
                "field": "timestamp",
                "operationType": "date_histogram",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "number",
              "isBucketed": true,
              "scale": "interval",
            },
            "operations": Array [
              Object {
                "field": "bytes",
                "operationType": "range",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "string",
              "isBucketed": true,
              "scale": "ordinal",
            },
            "operations": Array [
              Object {
                "operationType": "filters",
                "type": "none",
              },
              Object {
                "field": "source",
                "operationType": "terms",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "number",
              "isBucketed": true,
              "scale": "ordinal",
            },
            "operations": Array [
              Object {
                "field": "bytes",
                "operationType": "terms",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "number",
              "isBucketed": false,
              "scale": "ratio",
            },
            "operations": Array [
              Object {
                "field": "bytes",
                "operationType": "median",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "average",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "sum",
                "type": "field",
              },
              Object {
                "operationType": "cumulative_sum",
                "type": "fullReference",
              },
              Object {
                "operationType": "counter_rate",
                "type": "fullReference",
              },
              Object {
                "operationType": "differences",
                "type": "fullReference",
              },
              Object {
                "operationType": "moving_average",
                "type": "fullReference",
              },
              Object {
                "operationType": "overall_sum",
                "type": "fullReference",
              },
              Object {
                "operationType": "overall_min",
                "type": "fullReference",
              },
              Object {
                "operationType": "overall_max",
                "type": "fullReference",
              },
              Object {
                "operationType": "overall_average",
                "type": "fullReference",
              },
              Object {
                "operationType": "normalize_by_unit",
                "type": "fullReference",
              },
              Object {
                "field": "bytes",
                "operationType": "min",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "max",
                "type": "field",
              },
              Object {
                "field": "timestamp",
                "operationType": "unique_count",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "unique_count",
                "type": "field",
              },
              Object {
                "field": "source",
                "operationType": "unique_count",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "percentile",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "last_value",
                "type": "field",
              },
              Object {
                "operationType": "math",
                "type": "managedReference",
              },
              Object {
                "operationType": "formula",
                "type": "managedReference",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "date",
              "isBucketed": false,
              "scale": "ratio",
            },
            "operations": Array [
              Object {
                "field": "timestamp",
                "operationType": "min",
                "type": "field",
              },
              Object {
                "field": "timestamp",
                "operationType": "max",
                "type": "field",
              },
              Object {
                "field": "timestamp",
                "operationType": "last_value",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "string",
              "isBucketed": false,
              "scale": "ordinal",
            },
            "operations": Array [
              Object {
                "field": "source",
                "operationType": "last_value",
                "type": "field",
              },
            ],
          },
          Object {
            "operationMetaData": Object {
              "dataType": "number",
              "isBucketed": false,
              "isStaticValue": true,
              "scale": "ratio",
            },
            "operations": Array [
              Object {
                "operationType": "static_value",
                "type": "managedReference",
              },
            ],
          },
        ]
      `);
    });
  });
});
