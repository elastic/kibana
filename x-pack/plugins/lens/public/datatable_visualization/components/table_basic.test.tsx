/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReactWrapper, shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiDataGrid } from '@elastic/eui';
import { IAggType } from 'src/plugins/data/public';
import {
  FieldFormatParams,
  IFieldFormat,
  SerializedFieldFormat,
} from 'src/plugins/field_formats/common';
import { VisualizationContainer } from '../../visualization_container';
import { EmptyPlaceholder } from '../../../../../../src/plugins/charts/public';
import { LensIconChartDatatable } from '../../assets/chart_datatable';
import { DataContext, DatatableComponent } from './table_basic';
import { LensMultiTable } from '../../../common';
import { DatatableProps } from '../../../common/expressions';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { IUiSettingsClient } from 'kibana/public';
import { RenderMode } from 'src/plugins/expressions';

import { LENS_EDIT_PAGESIZE_ACTION } from './constants';

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
    rowHeightLines: 1,
  };

  return { data, args };
}

function copyData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

async function waitForWrapperUpdate(wrapper: ReactWrapper) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  wrapper.update();
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
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          renderMode="edit"
          interactive
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
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          interactive
        />
      )
    ).toMatchSnapshot();
  });

  test('it should render hide, reset, and sort actions on header even when it is in read only mode', () => {
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
          renderMode="view"
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          interactive
        />
      )
    ).toMatchSnapshot();
  });

  test('it invokes executeTriggerActions with correct context on click on top value', async () => {
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').first().simulate('focus');

    await waitForWrapperUpdate(wrapper);

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
      },
    });
  });

  test('it invokes executeTriggerActions with correct context on click on timefield', async () => {
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').at(1).simulate('focus');

    await waitForWrapperUpdate(wrapper);

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
      },
    });
  });

  test('it invokes executeTriggerActions with correct context on click on timefield from range', async () => {
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
      rowHeightLines: 1,
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').at(0).simulate('focus');

    await waitForWrapperUpdate(wrapper);

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
      },
    });
  });

  test('it should not invoke executeTriggerActions if interactivity is set to false', async () => {
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive={false}
      />
    );

    wrapper.find('[data-test-subj="dataGridRowCell"]').first().simulate('focus');

    await waitForWrapperUpdate(wrapper);

    expect(wrapper.find('[data-test-subj="lensDatatableFilterOut"]').exists()).toBe(false);
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );
    expect(component.find(VisualizationContainer)).toHaveLength(1);
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
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
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
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
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
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
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
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

  test('it detect last_value filtered metric type', () => {
    const { data, args } = sampleArgs();

    const table = data.tables.l1;
    const column = table.columns[1];

    column.meta = {
      ...column.meta,
      field: undefined,
      type: 'number',
      sourceParams: { ...column.meta.sourceParams, type: 'filtered_metric' },
    };
    table.rows[0].b = 'Hello';

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
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    expect(wrapper.find(DataContext.Provider).prop('value').alignments).toEqual({
      // set via args
      a: 'center',
      // default for string
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
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );
    // mnake a copy of the data, changing only the name of the first column
    const newData = copyData(data);
    newData.tables.l1.columns[0].name = 'new a';
    wrapper.setProps({ data: newData });
    wrapper.update();

    // Using .toContain over .toEqual because this element includes text from <EuiScreenReaderOnly>
    // which can't be seen, but shows in the text content
    expect(wrapper.find('[data-test-subj="dataGridHeader"]').children().first().text()).toContain(
      'new a'
    );
  });

  test('it does compute minMax for each numeric column', () => {
    const { data, args } = sampleArgs();

    const wrapper = shallow(
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
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    expect(wrapper.find(DataContext.Provider).prop('value').minMaxByColumnId).toEqual({
      c: { min: 3, max: 3 },
    });
  });

  test('it does render a summary footer if at least one column has it configured', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          columns: [
            ...args.columns.slice(0, 2),
            {
              columnId: 'c',
              type: 'lens_datatable_column',
              summaryRow: 'sum',
              summaryLabel: 'Sum',
              summaryRowValue: 3,
            },
          ],
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );
    expect(wrapper.find('[data-test-subj="lnsDataTable-footer-a"]').exists()).toEqual(false);
    expect(wrapper.find('[data-test-subj="lnsDataTable-footer-c"]').first().text()).toEqual(
      'Sum: 3'
    );
  });

  test('it does render a summary footer with just the raw value for empty label', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          columns: [
            ...args.columns.slice(0, 2),
            {
              columnId: 'c',
              type: 'lens_datatable_column',
              summaryRow: 'sum',
              summaryLabel: '',
              summaryRowValue: 3,
            },
          ],
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    expect(wrapper.find('[data-test-subj="lnsDataTable-footer-c"]').first().text()).toEqual('3');
  });

  test('it does not render the summary row if the only column with summary is hidden', () => {
    const { data, args } = sampleArgs();

    const wrapper = mountWithIntl(
      <DatatableComponent
        data={data}
        args={{
          ...args,
          columns: [
            ...args.columns.slice(0, 2),
            {
              columnId: 'c',
              type: 'lens_datatable_column',
              summaryRow: 'sum',
              summaryLabel: '',
              summaryRowValue: 3,
              hidden: true,
            },
          ],
          sortingColumnId: 'b',
          sortingDirection: 'desc',
        }}
        formatFactory={() => ({ convert: (x) => x } as IFieldFormat)}
        dispatchEvent={onDispatchEvent}
        getType={jest.fn()}
        renderMode="view"
        paletteService={chartPluginMock.createPaletteRegistry()}
        uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
        interactive
      />
    );

    expect(wrapper.find('[data-test-subj="lnsDataTable-footer-c"]').exists()).toBe(false);
  });

  describe('pagination', () => {
    it('enables pagination', async () => {
      const { data, args } = sampleArgs();

      args.pageSize = 10;

      const wrapper = mount(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          renderMode="edit"
          interactive
        />
      );

      const paginationConfig = wrapper.find(EuiDataGrid).prop('pagination');
      expect(paginationConfig).toBeTruthy();
      expect(paginationConfig?.pageIndex).toBe(0); // should start at 0
      expect(paginationConfig?.pageSize).toBe(args.pageSize);

      // trigger new page
      const newIndex = 3;
      act(() => paginationConfig?.onChangePage(newIndex));
      wrapper.update();

      const updatedConfig = wrapper.find(EuiDataGrid).prop('pagination');
      expect(updatedConfig).toBeTruthy();
      expect(updatedConfig?.pageIndex).toBe(newIndex);
      expect(updatedConfig?.pageSize).toBe(args.pageSize);
    });

    it('disables pagination by default', async () => {
      const { data, args } = sampleArgs();

      delete args.pageSize;

      const wrapper = mount(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          renderMode="edit"
          interactive
        />
      );

      const paginationConfig = wrapper.find(EuiDataGrid).prop('pagination');
      expect(paginationConfig).not.toBeTruthy();
    });

    it('dynamically toggles pagination', async () => {
      const { data, args } = sampleArgs();

      const argsWithPagination = copyData(args);
      argsWithPagination.pageSize = 20;

      const argsWithoutPagination = copyData(args);
      delete argsWithoutPagination.pageSize;

      const defaultProps = {
        data,
        formatFactory: (x?: SerializedFieldFormat<FieldFormatParams>) => x as IFieldFormat,
        dispatchEvent: onDispatchEvent,
        getType: jest.fn(),
        paletteService: chartPluginMock.createPaletteRegistry(),
        uiSettings: { get: jest.fn() } as unknown as IUiSettingsClient,
        renderMode: 'edit' as RenderMode,
        interactive: true,
      };

      const wrapper = mount(
        <DatatableComponent {...{ ...defaultProps, args: argsWithoutPagination }} />
      );
      wrapper.update();

      expect(wrapper.find(EuiDataGrid).prop('pagination')).not.toBeTruthy();

      wrapper.setProps({ args: argsWithPagination });
      wrapper.update();

      expect(wrapper.find(EuiDataGrid).prop('pagination')).toBeTruthy();

      wrapper.setProps({ args: argsWithoutPagination });
      wrapper.update();

      expect(wrapper.find(EuiDataGrid).prop('pagination')).not.toBeTruthy();
    });

    it('dispatches event when page size changed', async () => {
      const { data, args } = sampleArgs();

      args.pageSize = 10;

      const wrapper = mount(
        <DatatableComponent
          data={data}
          args={args}
          formatFactory={(x) => x as IFieldFormat}
          dispatchEvent={onDispatchEvent}
          getType={jest.fn()}
          paletteService={chartPluginMock.createPaletteRegistry()}
          uiSettings={{ get: jest.fn() } as unknown as IUiSettingsClient}
          renderMode="edit"
          interactive
        />
      );

      const paginationConfig = wrapper.find(EuiDataGrid).prop('pagination');
      expect(paginationConfig).toBeTruthy();

      const sizeToChangeTo = 100;
      paginationConfig?.onChangeItemsPerPage(sizeToChangeTo);

      expect(onDispatchEvent).toHaveBeenCalledTimes(1);
      expect(onDispatchEvent).toHaveBeenCalledWith({
        name: 'edit',
        data: {
          action: LENS_EDIT_PAGESIZE_ACTION,
          size: sizeToChangeTo,
        },
      });
    });
  });
});
