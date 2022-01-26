/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { BodyComponent, StatefulBodyProps } from '.';
import { Sort } from './sort';
import { REMOVE_COLUMN } from './column_headers/translations';
import { Direction } from '../../../../common/search_strategy';
import { useMountAppended } from '../../utils/use_mount_appended';
import { defaultHeaders, mockBrowserFields, mockTimelineData, TestProviders } from '../../../mock';
import { ColumnHeaderOptions, TimelineTabs } from '../../../../common/types/timeline';
import { TestCellRenderer } from '../../../mock/cell_renderer';
import { mockGlobalState } from '../../../mock/global_state';
import { EuiDataGridColumn } from '@elastic/eui';
import { defaultColumnHeaderType } from '../../../store/t_grid/defaults';

const mockSort: Sort[] = [
  {
    columnId: '@timestamp',
    columnType: 'number',
    sortDirection: Direction.desc,
  },
];

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../hooks/use_selector', () => ({
  useShallowEqualSelector: () => mockGlobalState.timelineById.test,
  useDeepEqualSelector: () => mockGlobalState.timelineById.test,
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

describe('Body', () => {
  const mount = useMountAppended();
  const props: StatefulBodyProps = {
    activePage: 0,
    browserFields: mockBrowserFields,
    clearSelected: jest.fn() as unknown as StatefulBodyProps['clearSelected'],
    columnHeaders: defaultHeaders,
    data: mockTimelineData,
    defaultCellActions: [],
    disabledCellActions: ['signal.rule.risk_score', 'signal.reason'],
    excludedRowRendererIds: [],
    id: 'timeline-test',
    isSelectAllChecked: false,
    isLoading: false,
    itemsPerPageOptions: [],
    loadingEventIds: [],
    loadPage: jest.fn(),
    pageSize: 25,
    renderCellValue: TestCellRenderer,
    rowRenderers: [],
    selectedEventIds: {},
    setSelected: jest.fn() as unknown as StatefulBodyProps['setSelected'],
    sort: mockSort,
    showCheckboxes: false,
    tabType: TimelineTabs.query,
    tableView: 'gridView',
    totalItems: 1,
    leadingControlColumns: [],
    trailingControlColumns: [],
    filterStatus: 'open',
    filterQuery: '',
    refetch: jest.fn(),
    indexNames: [''],
  };

  beforeEach(() => {
    mockDispatch.mockReset();
  });

  describe('rendering', () => {
    test('it renders the body data grid', () => {
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...props} />
        </TestProviders>
      );
      expect(wrapper.find('[data-test-subj="body-data-grid"]').first().exists()).toEqual(true);
    });

    test('it renders the column headers', () => {
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataGridHeader"]').first().exists()).toEqual(true);
    });

    test('it renders the scroll container', () => {
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('div.euiDataGrid__virtualized').first().exists()).toEqual(true);
    });

    test('it renders events', () => {
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...props} />
        </TestProviders>
      );

      expect(wrapper.find('div.euiDataGridRowCell').first().exists()).toEqual(true);
    });

    test('it renders cell value', () => {
      const headersJustTimestamp = defaultHeaders.filter((h) => h.id === '@timestamp');
      const testProps = {
        ...props,
        columnHeaders: headersJustTimestamp,
        data: mockTimelineData.slice(0, 1),
      };
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...testProps} />
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

    test('timestamp column renders cell actions', () => {
      const headersJustTimestamp = defaultHeaders.filter((h) => h.id === '@timestamp');
      const testProps = {
        ...props,
        columnHeaders: headersJustTimestamp,
        data: mockTimelineData.slice(0, 1),
      };
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...testProps} />
        </TestProviders>
      );
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="body-data-grid"]')
          .first()
          .prop<EuiDataGridColumn[]>('columns')
          .find((c) => c.id === '@timestamp')?.cellActions
      ).toBeDefined();
    });

    test("signal.rule.risk_score column doesn't render cell actions", () => {
      const columnHeaders = [
        {
          category: 'signal',
          columnHeaderType: defaultColumnHeaderType,
          id: 'signal.rule.risk_score',
          type: 'number',
          aggregatable: true,
          initialWidth: 105,
        },
      ];
      const testProps = {
        ...props,
        columnHeaders,
        data: mockTimelineData.slice(0, 1),
      };
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...testProps} />
        </TestProviders>
      );
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="body-data-grid"]')
          .first()
          .prop<EuiDataGridColumn[]>('columns')
          .find((c) => c.id === 'signal.rule.risk_score')?.cellActions
      ).toBeUndefined();
    });

    test("signal.reason column doesn't render cell actions", () => {
      const columnHeaders = [
        {
          category: 'signal',
          columnHeaderType: defaultColumnHeaderType,
          id: 'signal.reason',
          type: 'string',
          aggregatable: true,
          initialWidth: 450,
        },
      ];
      const testProps = {
        ...props,
        columnHeaders,
        data: mockTimelineData.slice(0, 1),
      };
      const wrapper = mount(
        <TestProviders>
          <BodyComponent {...testProps} />
        </TestProviders>
      );
      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="body-data-grid"]')
          .first()
          .prop<EuiDataGridColumn[]>('columns')
          .find((c) => c.id === 'signal.reason')?.cellActions
      ).toBeUndefined();
    });
  });

  test("signal.rule.risk_score column doesn't render cell actions", () => {
    const columnHeaders = [
      {
        category: 'signal',
        columnHeaderType: defaultColumnHeaderType,
        id: 'signal.rule.risk_score',
        type: 'number',
        aggregatable: true,
        initialWidth: 105,
      },
    ];
    const testProps = {
      ...props,
      columnHeaders,
      data: mockTimelineData.slice(0, 1),
    };
    const wrapper = mount(
      <TestProviders>
        <BodyComponent {...testProps} />
      </TestProviders>
    );
    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="body-data-grid"]')
        .first()
        .prop<EuiDataGridColumn[]>('columns')
        .find((c) => c.id === 'signal.rule.risk_score')?.cellActions
    ).toBeUndefined();
  });

  test('it does NOT render switches for hiding columns in the `EuiDataGrid` `Columns` popover', async () => {
    render(
      <TestProviders>
        <BodyComponent {...props} />
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
        <BodyComponent {...props} />
      </TestProviders>
    );

    // click the `@timestamp` column header to display the popover
    fireEvent.click(screen.getByText('@timestamp'));

    // click the `Remove column` action in the popover
    fireEvent.click(await screen.getByText(REMOVE_COLUMN));

    expect(mockDispatch).toBeCalledWith({
      payload: { columnId: '@timestamp', id: 'timeline-test' },
      type: 'x-pack/timelines/t-grid/REMOVE_COLUMN',
    });
  });

  test('it dispatches the `UPDATE_COLUMN_WIDTH` action when a user resizes a column', async () => {
    render(
      <TestProviders>
        <BodyComponent {...props} />
      </TestProviders>
    );

    // simulate resizing the column
    fireEvent.mouseDown(screen.getAllByTestId('dataGridColumnResizer')[0]);
    fireEvent.mouseMove(screen.getAllByTestId('dataGridColumnResizer')[0]);
    fireEvent.mouseUp(screen.getAllByTestId('dataGridColumnResizer')[0]);

    expect(mockDispatch).toBeCalledWith({
      payload: { columnId: '@timestamp', id: 'timeline-test', width: NaN },
      type: 'x-pack/timelines/t-grid/UPDATE_COLUMN_WIDTH',
    });
  });

  test('it dispatches the `REMOVE_COLUMN` action when there is a field removed from the custom fields', async () => {
    const customFieldId = 'my.custom.runtimeField';
    const extraFieldProps = {
      ...props,
      columnHeaders: [
        ...defaultHeaders,
        { id: customFieldId, category: 'my' } as ColumnHeaderOptions,
      ],
    };
    render(
      <TestProviders>
        <BodyComponent {...extraFieldProps} />
      </TestProviders>
    );

    expect(mockDispatch).toBeCalledTimes(1);
    expect(mockDispatch).toBeCalledWith({
      payload: { columnId: customFieldId, id: 'timeline-test' },
      type: 'x-pack/timelines/t-grid/REMOVE_COLUMN',
    });
  });
});
