/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { BodyComponent, StatefulBodyProps } from '.';
import { Sort } from './sort';
import { Direction } from '../../../../common/search_strategy';
import { useMountAppended } from '../../utils/use_mount_appended';
import { defaultHeaders, mockBrowserFields, mockTimelineData, TestProviders } from '../../../mock';
import { TimelineTabs } from '../../../../common/types/timeline';
import { TestCellRenderer } from '../../../mock/cell_renderer';
import { mockGlobalState } from '../../../mock/global_state';

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

      expect(wrapper.find('div.euiDataGrid__overflow').first().exists()).toEqual(true);
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
  });
});
