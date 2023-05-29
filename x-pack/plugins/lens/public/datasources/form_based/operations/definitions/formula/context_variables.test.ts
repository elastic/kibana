/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedLayer } from '../../../../..';
import { createMockedIndexPattern } from '../../../mocks';
import { ConstantIndexPatternColumn, constantsOperation } from './context_variables';

describe('context variables', () => {
  describe('constant', () => {
    function createLayer(value: string): FormBasedLayer {
      return {
        indexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            label: 'Constants',
            dataType: 'number',
            operationType: 'constant',
            isBucketed: false,
            scale: 'ratio',
            params: {
              value,
            },
            references: [],
          } as ConstantIndexPatternColumn,
        },
      };
    }

    describe('getErrorMessages', () => {
      it('should return error if provided constant value is not available', () => {
        expect(
          constantsOperation.getErrorMessage!(
            createLayer('ssh_keys'),
            'col1',
            createMockedIndexPattern(),
            { fromDate: new Date().toDateString(), toDate: new Date().toDateString() }
          )
        ).toEqual(['The "ssh_keys" constant not available']);
      });
    });
  });
});
