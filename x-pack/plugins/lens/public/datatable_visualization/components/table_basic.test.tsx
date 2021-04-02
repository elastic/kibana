/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { mountWithIntl } from '@kbn/test/jest';
import { EuiDataGrid } from '@elastic/eui';
import { IAggType, IFieldFormat } from 'src/plugins/data/public';
import { EmptyPlaceholder } from '../../shared_components';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import { DataContext, DatatableComponent } from './table_basic';
import { LensMultiTable } from '../../types';
import { DatatableProps } from '../expression';

function sampleArgs() {
  const indexPatternId = 'indexPatternId';
  const data: LensMultiTable = {
    type: 'lens_multitable',
    tables: {
      l1: {
        type: 'datatable',
        columns: [
          {
            id: 'a',
            name: 'a',
            meta: {
              type: 'string',
              source: 'esaggs',
              field: 'a',
              sourceParams: { type: 'terms', indexPatternId },
            },
          },
          {
            id: 'b',
            name: 'b',
            meta: {
              type: 'date',
              field: 'b',
              source: 'esaggs',
              sourceParams: {
                type: 'date_histogram',
                indexPatternId,
              },
            },
          },
          {
            id: 'c',
            name: 'c',
            meta: {
              type: 'number',
              source: 'esaggs',
              field: 'c',
              sourceParams: { indexPatternId, type: 'count' },
            },
          },
        ],
        rows: [{ a: 'shoes', b: 1588024800000, c: 3 }],
      },
    },
  };

  const args: DatatableProps['args'] = {
    title: 'My fanci metric chart',
    columns: [
      { columnId: 'a', type: 'lens_datatable_column' },
      { columnId: 'b', type: 'lens_datatable_column' },
      { columnId: 'c', type: 'lens_datatable_column' },
    ],
    sortingColumnId: '',
    sortingDirection: 'none',
  };

  return { data, args };
}

function copyData(data: LensMultiTable): LensMultiTable {
  return JSON.parse(JSON.stringify(data));
}

describe('DatatableComponent', () => {
  let onDispatchEvent: jest.Mock;

  beforeEach(() => {
    onDispatchEvent = jest.fn();
  });

  test('it renders the title and value', () => {
    const { data, args } = sampleArgs();

    expect(
      shallow(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          renderMode="edit"
        />
      )
    ).toMatchSnapshot();
  });

  test('it renders actions column when there are row actions', () => {
    const { data, args } = sampleArgs();

    expect(
      shallow(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          rowHasRowClickTriggerActions={[true, true, true]}
          renderMode="edit"
        />
      )
    ).toMatchSnapshot();
  });

  test('it should not render actions on header when it is in read only mode', () => {
    const { data, args } = sampleArgs();

    expect(
      shallow(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          rowHasRowClickTriggerActions={[false, false, false]}
          renderMode="display"
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
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        renderMode="edit"
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').first().simulate('focus');

    wrapper.find('[data-test-subj="lensDatatableFilterOut"]').first().simulate('click');

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
        data: [
          {
            column: 0,
            row: 0,
            table: data.tables.l1,
            value: 'shoes',
          },
        ],
        negate: true,
        timeFieldName: 'a',
      },
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
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        renderMode="edit"
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').at(1).simulate('focus');

    wrapper.find('[data-test-subj="lensDatatableFilterFor"]').first().simulate('click');

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
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
      },
    });
  });

  test('it invokes executeTriggerActions with correct context on click on timefield from range', () => {
    const data: LensMultiTable = {
      type: 'lens_multitable',
      tables: {
        l1: {
          type: 'datatable',
          columns: [
            {
              id: 'a',
              name: 'a',
              meta: {
                type: 'date',
                source: 'esaggs',
                field: 'a',
                sourceParams: { type: 'date_range', indexPatternId: 'a' },
              },
            },
            {
              id: 'b',
              name: 'b',
              meta: {
                type: 'number',
                source: 'esaggs',
                sourceParams: { type: 'count', indexPatternId: 'a' },
              },
            },
          ],
          rows: [{ a: 1588024800000, b: 3 }],
        },
      },
    };

    const args: DatatableProps['args'] = {
      title: '',
      columns: [
        { columnId: 'a', type: 'lens_datatable_column' },
        { columnId: 'b', type: 'lens_datatable_column' },
      ],
      sortingColumnId: '',
      sortingDirection: 'none',
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
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn(() => ({ type: 'buckets' } as IAggType))}
        renderMode="edit"
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').at(0).simulate('focus');

    wrapper.find('[data-test-subj="lensDatatableFilterFor"]').first().simulate('click');

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
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
      },
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
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn((type) =>
          type === 'count' ? ({ type: 'metrics' } as IAggType) : ({ type: 'buckets' } as IAggType)
        )}
        renderMode="edit"
      />
    );
    expect(component.find(EmptyPlaceholder).prop('icon')).toEqual(LensIconChartDatatable);
  });

  test('it renders the table with the given sorting', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="edit"
      />
    );

    expect(wrapper.find(EuiDataGrid).prop('sorting')!.columns).toEqual([
      { id: 'b', direction: 'desc' },
    ]);

    wrapper.find(EuiDataGrid).prop('sorting')!.onSort([]);

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'edit',
      data: {
        action: 'sort',
        columnId: undefined,
        direction: 'none',
      },
    });

    wrapper
      .find(EuiDataGrid)
      .prop('sorting')!
      .onSort([{ id: 'a', direction: 'asc' }]);

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'edit',
      data: {
        action: 'sort',
        columnId: 'a',
        direction: 'asc',
      },
    });
  });

  test('it renders the table with the given sorting in readOnly mode', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="display"
      />
    );

    expect(wrapper.find(EuiDataGrid).prop('sorting')!.columns).toEqual([
      { id: 'b', direction: 'desc' },
    ]);
  });

  test('it does not render a hidden column', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          columns: [
            { columnId: 'a', hidden: true, type: 'lens_datatable_column' },
            { columnId: 'b', type: 'lens_datatable_column' },
            { columnId: 'c', type: 'lens_datatable_column' },
          ],
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="display"
      />
    );

    expect(wrapper.find(EuiDataGrid).prop('columns')!.length).toEqual(2);
  });

  test('it adds alignment data to context', () => {
    const { data, args } = sampleArgs();

    const wrapper = shallow(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          columns: [
            { columnId: 'a', alignment: 'center', type: 'lens_datatable_column' },
            { columnId: 'b', type: 'lens_datatable_column' },
            { columnId: 'c', type: 'lens_datatable_column' },
          ],
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="display"
      />
    );

    expect(wrapper.find(DataContext.Provider).prop('value').alignments).toEqual({
      // set via args
      a: 'center',
      // default for date
      b: 'left',
      // default for number
      c: 'right',
    });
  });

  test('it should refresh the table header when the datatable data changes', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={args}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="edit"
      />
    );
    // mnake a copy of the data, changing only the name of the first column
    const newData = copyData(data);
    newData.tables.l1.columns[0].name = 'new a';
    wrapper.setProps({ data: newData });
    wrapper.update();

    expect(wrapper.find('[data-test-subj="dataGridHeader"]').children().first().text()).toEqual(
      'new a'
    );
  });
});
