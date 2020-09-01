/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { datatable, DatatableComponent } from './expression';
import { LensMultiTable } from '../types';
import { DatatableProps } from './expression';
import { createMockExecutionContext } from '../../../../../src/plugins/expressions/common/mocks';
import { IFieldFormat } from '../../../../../src/plugins/data/public';
import { IAggType } from 'src/plugins/data/public';
const onClickValue = jest.fn();
import { EmptyPlaceholder } from '../shared_components';

function sampleArgs() {
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'kibana_datatable',
        columns: [
          { id: 'a', name: 'a', meta: { type: 'terms' } },
          { id: 'b', name: 'b', meta: { type: 'date_histogram', aggConfigParams: { field: 'b' } } },
          { id: 'c', name: 'c', meta: { type: 'count' } },
        ],
        rows: [{ a: 'shoes', b: 1588024800000, c: 3 }],
      },
    },
  };

  const args: DatatableProps['args'] = {
    title: 'My fanci metric chart',
    columns: {
      columnIds: ['a', 'b', 'c'],
      type: 'lens_datatable_columns',
    },
  };

  return { data, args };
}

describe('datatable_expression', () => {
  describe('datatable renders', () => {
    test('it renders with the specified data and args', () => {
      const { data, args } = sampleArgs();
      const result = datatable.fn(data, args, createMockExecutionContext());

      expect(result).toEqual({
        type: 'render',
        as: 'lens_datatable_renderer',
        value: { data, args },
      });
    });
  });

  describe('DatatableComponent', () => {
    test('it renders the title and value', () => {
      const { data, args } = sampleArgs();

      expect(
        shallow(
          <DatatableComponent
            data={data}
            args={args}
            formatFactory={(x) => x as IFieldFormat}
            onClickValue={onClickValue}
            getType={jest.fn()}
          />
        )
      ).toMatchSnapshot();
    });

    test('it invokes executeTriggerActions with correct context on click on top value', () => {
      const { args, data } = sampleArgs();

      const wrapper = mountWithIntl(
        <DatatableComponent
          data={{
            ...data,
            dateRange: {
              fromDate: new Date('2020-04-20T05:00:00.000Z'),
              toDate: new Date('2020-05-03T05:00:00.000Z'),
            },
          }}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          onClickValue={onClickValue}
          getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        />
      );

      wrapper.find('[data-test-subj="lensDatatableFilterOut"]').first().simulate('click');

      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: data.tables.l1,
            value: 'shoes',
          },
        ],
        negate: true,
        timeFieldName: undefined,
      });
    });

    test('it invokes executeTriggerActions with correct context on click on timefield', () => {
      const { args, data } = sampleArgs();

      const wrapper = mountWithIntl(
        <DatatableComponent
          data={{
            ...data,
            dateRange: {
              fromDate: new Date('2020-04-20T05:00:00.000Z'),
              toDate: new Date('2020-05-03T05:00:00.000Z'),
            },
          }}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          onClickValue={onClickValue}
          getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        />
      );

      wrapper.find('[data-test-subj="lensDatatableFilterFor"]').at(3).simulate('click');

      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 1,
            row: 0,
            table: data.tables.l1,
            value: 1588024800000,
          },
        ],
        negate: false,
        timeFieldName: 'b',
      });
    });

    test('it invokes executeTriggerActions with correct context on click on timefield from range', () => {
      const data: LensMultiTable = {
        type: 'lens_multitable',
        tables: {
          l1: {
            type: 'kibana_datatable',
            columns: [
              { id: 'a', name: 'a', meta: { type: 'date_range', aggConfigParams: { field: 'a' } } },
              { id: 'b', name: 'b', meta: { type: 'count' } },
            ],
            rows: [{ a: 1588024800000, b: 3 }],
          },
        },
      };

      const args: DatatableProps['args'] = {
        title: '',
        columns: { columnIds: ['a', 'b'], type: 'lens_datatable_columns' },
      };

      const wrapper = mountWithIntl(
        <DatatableComponent
          data={{
            ...data,
            dateRange: {
              fromDate: new Date('2020-04-20T05:00:00.000Z'),
              toDate: new Date('2020-05-03T05:00:00.000Z'),
            },
          }}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          onClickValue={onClickValue}
          getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        />
      );

      wrapper.find('[data-test-subj="lensDatatableFilterFor"]').at(1).simulate('click');

      expect(onClickValue).toHaveBeenCalledWith({
        data: [
          {
            column: 0,
            row: 0,
            table: data.tables.l1,
            value: 1588024800000,
          },
        ],
        negate: false,
        timeFieldName: 'a',
      });
    });

    test('it shows emptyPlaceholder for undefined bucketed data', () => {
      const { args, data } = sampleArgs();
      const emptyData: LensMultiTable = {
        ...data,
        tables: {
          l1: {
            ...data.tables.l1,
            rows: [{ a: undefined, b: undefined, c: 0 }],
          },
        },
      };

      const component = shallow(
        <DatatableComponent
          data={emptyData}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          onClickValue={onClickValue}
          getType={jest.fn((type) =>
            type === 'count' ? ({ type: 'metrics' } as IAggType) : ({ type: 'buckets' } as IAggType)
          )}
        />
      );
      expect(component.find(EmptyPlaceholder).prop('icon')).toEqual('visTable');
    });
  });
});
