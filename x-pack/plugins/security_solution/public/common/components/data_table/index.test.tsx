/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import type { DataTableProps } from '.';
import { DataTableComponent } from '.';
import { REMOVE_COLUMN } from './column_headers/translations';
import { useMountAppended } from '../../utils/use_mount_appended';
import type { EuiDataGridColumn } from '@elastic/eui';
import { defaultHeaders, mockGlobalState, mockTimelineData, TestProviders } from '../../mock';
import { mockBrowserFields } from '../../containers/source/mock';
import { getMappedNonEcsValue } from '../../../timelines/components/timeline/body/data_driven_columns';
import type { CellValueElementProps } from '../../../../common/types';
import { TableId } from '../../../../common/types';
import { SecurityCellActionsTrigger } from '../cell_actions';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

const mockUseDataGridColumnsCellActions = jest.fn(
  (_: object): Array<Array<() => JSX.Element>> => []
);
jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  useDataGridColumnsCellActions: (params: object) => mockUseDataGridColumnsCellActions(params),
}));

const headersJustTimestamp = defaultHeaders.filter((h) => h.id === '@timestamp');
const mockGetColumnHeaders = jest.fn(() => headersJustTimestamp);
jest.mock('./column_headers/helpers', () => ({
  ...jest.requireActual('./column_headers/helpers'),
  getColumnHeaders: () => mockGetColumnHeaders(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        triggersActionsUi: {
          getFieldBrowser: jest.fn(),
        },
      },
    }),
  };
});

jest.mock('../../hooks/use_selector', () => ({
  useShallowEqualSelector: () => mockGlobalState.dataTable.tableById['table-test'],
  useDeepEqualSelector: () => mockGlobalState.dataTable.tableById['table-test'],
}));

jest.mock(
  'react-visibility-sensor',
  () =>
    ({ children }: { children: (args: { isVisible: boolean }) => React.ReactNode }) =>
      children({ isVisible: true })
);

window.matchMedia = jest.fn().mockImplementation((query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
});

export const TestCellRenderer: React.FC<CellValueElementProps> = ({ columnId, data }) => (
  <>
    {getMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]) ?? ''}
  </>
);

describe('DataTable', () => {
  const mount = useMountAppended();
  const props: DataTableProps = {
    browserFields: mockBrowserFields,
    data: mockTimelineData,
    id: TableId.test,
    loadPage: jest.fn(),
    renderCellValue: TestCellRenderer,
    rowRenderers: [],
    totalItems: 1,
    leadingControlColumns: [],
    unitCountText: '10 events',
    pagination: {
      pageSize: 25,
      pageIndex: 0,
      onChangeItemsPerPage: jest.fn(),
      onChangePage: jest.fn(),
    },
  };

  beforeEach(() => {
    mockDispatch.mockClear();
    mockUseDataGridColumnsCellActions.mockClear();
  });

  describe('rendering', () => {
    test('it renders the body data grid', () => {
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="body-data-grid"]').first().exists()).toEqual(true);
    });

    test('it renders the column headers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataGridHeader"]').first().exists()).toEqual(true);
    });

    test('it renders the scroll container', () => {
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('div.euiDataGrid__virtualized').first().exists()).toEqual(true);
    });

    test('it renders events', () => {
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('div.euiDataGridRowCell').first().exists()).toEqual(true);
    });

    test('it renders cell value', () => {
      const testProps = {
        ...props,
        data: mockTimelineData.slice(0, 1),
      };
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...testProps} />
        </TestProviders>
      );
      wrapper.update();
      expect(
        wrapper
          .find('[data-test-subj="dataGridRowCell"]')
          .at(0)
          .find('.euiDataGridRowCell__truncate')
          .childAt(0)
          .text()
      ).toEqual(mockTimelineData[0].ecs.timestamp);
    });
  });

  describe('cellActions', () => {
    test('calls useDataGridColumnsCellActions properly', () => {
      const data = mockTimelineData.slice(0, 1);
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} data={data} />
        </TestProviders>
      );
      wrapper.update();

      expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith({
        triggerId: SecurityCellActionsTrigger.DEFAULT,
        fields: [
          {
            name: '@timestamp',
            values: [data[0]?.data[0]?.value],
            type: 'date',
            aggregatable: true,
          },
        ],
        metadata: {
          scopeId: 'table-test',
        },
        dataGridRef: expect.any(Object),
      });
    });

    test('does not render cell actions if disableCellActions is true', () => {
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} data={mockTimelineData.slice(0, 1)} disableCellActions />
        </TestProviders>
      );
      wrapper.update();

      expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [],
        })
      );
    });

    test('does not render cell actions if empty actions returned', () => {
      mockUseDataGridColumnsCellActions.mockReturnValueOnce([]);
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} data={mockTimelineData.slice(0, 1)} />
        </TestProviders>
      );
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="body-data-grid"]')
          .first()
          .prop<EuiDataGridColumn[]>('columns')
          .find((c) => c.id === '@timestamp')?.cellActions
      ).toHaveLength(0);
    });

    test('renders returned cell actions', () => {
      mockUseDataGridColumnsCellActions.mockReturnValueOnce([[() => <div />]]);
      const wrapper = mount(
        <TestProviders>
          <DataTableComponent {...props} data={mockTimelineData.slice(0, 1)} />
        </TestProviders>
      );
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="body-data-grid"]')
          .first()
          .prop<EuiDataGridColumn[]>('columns')
          .find((c) => c.id === '@timestamp')?.cellActions
      ).toHaveLength(1);
    });
  });

  test('it does NOT render switches for hiding columns in the `EuiDataGrid` `Columns` popover', async () => {
    render(
      <TestProviders>
        <DataTableComponent {...props} />
      </TestProviders>
    );

    // Click the `EuidDataGrid` `Columns` button to open the popover:
    fireEvent.click(screen.getByTestId('dataGridColumnSelectorButton'));

    // `EuiDataGrid` renders switches for hiding in the `Columns` popover when `showColumnSelector.allowHide` is `true`
    const switches = await screen.queryAllByRole('switch');

    expect(switches.length).toBe(0); // no switches are rendered, because `allowHide` is `false`
  });

  test('it dispatches the `REMOVE_COLUMN` action when a user clicks `Remove column` in the column header popover', async () => {
    render(
      <TestProviders>
        <DataTableComponent {...props} />
      </TestProviders>
    );

    // click the `@timestamp` column header to display the popover
    fireEvent.click(screen.getByText('@timestamp'));

    // click the `Remove column` action in the popover
    fireEvent.click(await screen.getByText(REMOVE_COLUMN));

    expect(mockDispatch).toBeCalledWith({
      payload: { columnId: '@timestamp', id: 'table-test' },
      type: 'x-pack/security_solution/data-table/REMOVE_COLUMN',
    });
  });

  test('it dispatches the `UPDATE_COLUMN_WIDTH` action when a user resizes a column', async () => {
    render(
      <TestProviders>
        <DataTableComponent {...props} />
      </TestProviders>
    );

    // simulate resizing the column
    fireEvent.mouseDown(screen.getAllByTestId('dataGridColumnResizer')[0]);
    fireEvent.mouseMove(screen.getAllByTestId('dataGridColumnResizer')[0]);
    fireEvent.mouseUp(screen.getAllByTestId('dataGridColumnResizer')[0]);

    expect(mockDispatch).toBeCalledWith({
      payload: { columnId: '@timestamp', id: 'table-test', width: NaN },
      type: 'x-pack/security_solution/data-table/UPDATE_COLUMN_WIDTH',
    });
  });
});
