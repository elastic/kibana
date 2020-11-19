/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        })
      ).toEqual(expect.arrayContaining(['avg', 'sum', 'min', 'max']));
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
    it('should put the average operation first', () => {
      const numberOperation = getAvailableOperationsByMetadata(expectedIndexPatterns[1]).find(
        ({ operationMetaData }) =>
          !operationMetaData.isBucketed && operationMetaData.dataType === 'number'
      )!;
      expect(numberOperation.operations[0]).toEqual(
        expect.objectContaining({
          operationType: 'avg',
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
                "operationType": "avg",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "sum",
                "type": "field",
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
                "operationType": "cardinality",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "cardinality",
                "type": "field",
              },
              Object {
                "field": "source",
                "operationType": "cardinality",
                "type": "field",
              },
              Object {
                "field": "bytes",
                "operationType": "median",
                "type": "field",
              },
            ],
          },
        ]
      `);
    });
  });
});
