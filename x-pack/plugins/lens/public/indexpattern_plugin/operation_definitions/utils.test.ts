/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateColumnParam } from './utils';
import { IndexPatternPrivateState, DateHistogramIndexPatternColumn } from '../indexpattern';

describe('operation utils', () => {
  it('should set the param for the given column', () => {
    const currentColumn: DateHistogramIndexPatternColumn = {
      operationId: 'op1',
      label: 'Value of timestamp',
      dataType: 'date',
      isBucketed: true,

      // Private
      operationType: 'date_histogram',
      params: {
        interval: '1d',
      },
      sourceField: 'timestamp',
    };

    const state: IndexPatternPrivateState = {
      indexPatterns: {},
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: currentColumn,
      },
    };

    expect(updateColumnParam(state, currentColumn, 'interval', 'M').columns.col1).toEqual({
      ...currentColumn,
      params: { interval: 'M' },
    });
  });
});
