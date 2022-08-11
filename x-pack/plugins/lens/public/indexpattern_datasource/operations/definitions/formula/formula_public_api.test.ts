/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertDataViewIntoLensIndexPattern } from '../../../loader';
import { insertOrReplaceFormulaColumn } from './parse';
import { createFormulaPublicApi, FormulaPublicApi } from './formula_public_api';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DateHistogramIndexPatternColumn, PersistedIndexPatternLayer } from '../../../types';

jest.mock('./parse', () => ({
  insertOrReplaceFormulaColumn: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../loader', () => ({
  convertDataViewIntoLensIndexPattern: jest.fn((v) => v),
}));

const getBaseLayer = (): PersistedIndexPatternLayer => ({
  columnOrder: ['col1'],
  columns: {
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
    } as DateHistogramIndexPatternColumn,
  },
});

describe('createFormulaPublicApi', () => {
  let publicApiHelper: FormulaPublicApi;
  let dataView: DataView;

  beforeEach(() => {
    publicApiHelper = createFormulaPublicApi();
    dataView = {} as DataView;

    jest.clearAllMocks();
  });

  test('should use cache for caching lens index patterns', () => {
    const baseLayer = getBaseLayer();

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    expect(convertDataViewIntoLensIndexPattern).toHaveBeenCalledTimes(1);
  });

  test('should execute insertOrReplaceFormulaColumn with valid arguments', () => {
    const baseLayer = getBaseLayer();

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    expect(insertOrReplaceFormulaColumn).toHaveBeenCalledWith(
      'col',
      {
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        label: 'count()',
        operationType: 'formula',
        params: { formula: 'count()' },
        references: [],
      },
      {
        columnOrder: ['col1'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: { interval: 'auto' },
            scale: 'interval',
          },
        },
        indexPatternId: undefined,
      },
      { indexPattern: {} }
    );
  });
});
