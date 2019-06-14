/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { dateHistogramOperation } from './date_histogram';
import { shallow } from 'enzyme';
import { DateHistogramIndexPatternColumn, IndexPatternPrivateState } from '../indexpattern';
import { EuiRange } from '@elastic/eui';

describe('date_histogram', () => {
  let state: IndexPatternPrivateState;
  const InlineOptions = dateHistogramOperation.paramEditor!;

  beforeEach(() => {
    state = {
      indexPatterns: {},
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'Value of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          params: {
            interval: 'w',
          },
          sourceField: 'timestamp',
        },
      },
    };
  });

  describe('toEsAggsConfig', () => {
    it('should reflect params correctly', () => {
      const esAggsConfig = dateHistogramOperation.toEsAggsConfig(
        state.columns.col1 as DateHistogramIndexPatternColumn,
        'col1'
      );
      expect(esAggsConfig).toEqual(
        expect.objectContaining({
          params: expect.objectContaining({
            interval: 'w',
            field: 'timestamp',
          }),
        })
      );
    });
  });

  describe('param editor', () => {
    it('should render current value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      expect(instance.find(EuiRange).prop('value')).toEqual(1);
    });

    it('should update state with the interval value', () => {
      const setStateSpy = jest.fn();
      const instance = shallow(
        <InlineOptions state={state} setState={setStateSpy} columnId="col1" />
      );

      instance.find(EuiRange).prop('onChange')!({
        target: {
          value: '2',
        },
      } as React.ChangeEvent<HTMLInputElement>);
      expect(setStateSpy).toHaveBeenCalledWith({
        ...state,
        columns: {
          ...state.columns,
          col1: {
            ...state.columns.col1,
            params: {
              interval: 'd',
            },
          },
        },
      });
    });
  });
});
