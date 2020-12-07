/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  sumOperation,
  averageOperation,
  countOperation,
  counterRateOperation,
  movingAverageOperation,
  derivativeOperation,
} from './definitions';
import { getFieldByNameFactory } from '../pure_helpers';
import { documentField } from '../document_field';
import { IndexPattern, IndexPatternLayer, IndexPatternField } from '../types';
import { IndexPatternColumn } from '.';

const indexPatternFields = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'start_date',
    displayName: 'start_date',
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
    name: 'memory',
    displayName: 'memory',
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
  {
    name: 'dest',
    displayName: 'dest',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  documentField,
];

const indexPattern = {
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: indexPatternFields,
  getFieldByName: getFieldByNameFactory([...indexPatternFields]),
};

const baseColumnArgs: {
  previousColumn: IndexPatternColumn;
  indexPattern: IndexPattern;
  layer: IndexPatternLayer;
  field: IndexPatternField;
} = {
  previousColumn: {
    label: 'Count of records per hour',
    timeScale: 'h',
    dataType: 'number',
    isBucketed: false,

    // Private
    operationType: 'count',
    sourceField: 'Records',
  },
  indexPattern,
  layer: {
    columns: {},
    columnOrder: [],
    indexPatternId: '1',
  },
  field: indexPattern.fields[2],
};

describe('time scale transition', () => {
  it('should carry over time scale and adjust label on operation from count to sum', () => {
    expect(
      sumOperation.buildColumn({
        ...baseColumnArgs,
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: 'h',
        label: 'Sum of bytes per hour',
      })
    );
  });

  it('should carry over time scale and adjust label on operation from count to calculation', () => {
    [counterRateOperation, movingAverageOperation, derivativeOperation].forEach(
      (calculationOperation) => {
        const result = calculationOperation.buildColumn({
          ...baseColumnArgs,
          referenceIds: [],
        });
        expect(result.timeScale).toEqual('h');
        expect(result.label).toContain('per hour');
      }
    );
  });

  it('should carry over time scale and adjust label on operation from sum to count', () => {
    expect(
      countOperation.buildColumn({
        ...baseColumnArgs,
        previousColumn: {
          label: 'Sum of bytes per hour',
          timeScale: 'h',
          dataType: 'number',
          isBucketed: false,
          operationType: 'sum',
          sourceField: 'bytes',
        },
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: 'h',
        label: 'Count of records per hour',
      })
    );
  });

  it('should not set time scale if it was not set previously', () => {
    expect(
      countOperation.buildColumn({
        ...baseColumnArgs,
        previousColumn: {
          label: 'Sum of bytes',
          dataType: 'number',
          isBucketed: false,
          operationType: 'sum',
          sourceField: 'bytes',
        },
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: undefined,
        label: 'Count of records',
      })
    );
  });

  it('should set time scale to default for counter rate', () => {
    expect(
      counterRateOperation.buildColumn({
        indexPattern,
        layer: {
          columns: {},
          columnOrder: [],
          indexPatternId: '1',
        },
        referenceIds: [],
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: 's',
      })
    );
  });

  it('should adjust label on field change', () => {
    expect(
      sumOperation.onFieldChange(
        {
          label: 'Sum of bytes per hour',
          timeScale: 'h',
          dataType: 'number',
          isBucketed: false,

          // Private
          operationType: 'sum',
          sourceField: 'bytes',
        },
        indexPattern.fields[3]
      )
    ).toEqual(
      expect.objectContaining({
        timeScale: 'h',
        label: 'Sum of memory per hour',
      })
    );
  });

  it('should not carry over time scale if target does not support time scaling', () => {
    const result = averageOperation.buildColumn({
      ...baseColumnArgs,
    });
    expect(result.timeScale).toBeUndefined();
  });
});
