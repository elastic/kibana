/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sumOperation,
  averageOperation,
  countOperation,
  counterRateOperation,
  movingAverageOperation,
  cumulativeSumOperation,
  derivativeOperation,
  AvgIndexPatternColumn,
  DerivativeIndexPatternColumn,
} from './definitions';
import { getFieldByNameFactory } from '../pure_helpers';
import { documentField } from '../document_field';
import { IndexPattern, IndexPatternLayer, IndexPatternField } from '../types';
import { GenericIndexPatternColumn } from '.';
import { DateHistogramIndexPatternColumn } from './definitions/date_histogram';

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
    displayName: 'bytesLabel',
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
  previousColumn: GenericIndexPatternColumn;
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
    sourceField: '___records___',
  },
  indexPattern,
  layer: {
    columns: {},
    columnOrder: [],
    indexPatternId: '1',
  },
  field: indexPattern.fields[2],
};

const layer: IndexPatternLayer = {
  indexPatternId: '1',
  columnOrder: ['date', 'metric', 'ref'],
  columns: {
    date: {
      label: '',
      customLabel: true,
      dataType: 'date',
      isBucketed: true,
      operationType: 'date_histogram',
      sourceField: 'timestamp',
      params: { interval: 'auto' },
    } as DateHistogramIndexPatternColumn,
    metric: {
      label: 'metricLabel',
      customLabel: true,
      dataType: 'number',
      isBucketed: false,
      operationType: 'average',
      sourceField: 'bytes',
      params: {},
    } as AvgIndexPatternColumn,
    ref: {
      label: '',
      customLabel: true,
      dataType: 'number',
      isBucketed: false,
      operationType: 'differences',
      references: ['metric'],
    } as DerivativeIndexPatternColumn,
  },
};

describe('labels', () => {
  const calcColumnArgs = {
    ...baseColumnArgs,
    referenceIds: ['metric'],
    layer,
    previousColumn: layer.columns.metric,
  };
  it('should use label of referenced operation to create label for derivative and moving average', () => {
    expect(derivativeOperation.buildColumn(calcColumnArgs)).toEqual(
      expect.objectContaining({
        label: 'Differences of metricLabel',
      })
    );
    expect(movingAverageOperation.buildColumn(calcColumnArgs)).toEqual(
      expect.objectContaining({
        label: 'Moving average of metricLabel',
      })
    );
  });

  it('should use displayName of a field for a label for counter rate and cumulative sum', () => {
    expect(counterRateOperation.buildColumn(calcColumnArgs)).toEqual(
      expect.objectContaining({
        label: 'Counter rate of bytesLabel per second',
      })
    );
    expect(cumulativeSumOperation.buildColumn(calcColumnArgs)).toEqual(
      expect.objectContaining({
        label: 'Cumulative sum of bytesLabel',
      })
    );
  });
});

describe('time scale transition', () => {
  it('should carry over time scale and adjust label on operation from count to sum', () => {
    expect(
      sumOperation.buildColumn({
        ...baseColumnArgs,
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: 'h',
        label: 'Sum of bytesLabel per hour',
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
          label: 'Sum of bytesLabel per hour',
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
