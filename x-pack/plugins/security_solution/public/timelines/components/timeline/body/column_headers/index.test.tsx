/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../../common/mock/match_media';
import { getActionsColumnWidth } from '../../../../../../../timelines/public';
import { defaultHeaders } from './default_headers';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { Sort } from '../sort';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { ColumnHeadersComponent } from '.';
import { cloneDeep } from 'lodash/fp';
import { timelineActions } from '../../../../store/timeline';
import { TimelineTabs } from '../../../../../../common/types/timeline';
import { Direction } from '../../../../../../common/search_strategy';
import { getDefaultControlColumn } from '../control_columns';
import { testTrailingControlColumns } from '../../../../../common/mock/mock_timeline_control_columns';
import { HeaderActions } from '../actions/header_actions';

jest.mock('../../../../../common/lib/kibana');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
const timelineId = 'test';

describe('ColumnHeaders', () => {
  const mount = useMountAppended();
  const ACTION_BUTTON_COUNT = 4;
  const actionsColumnWidth = getActionsColumnWidth(ACTION_BUTTON_COUNT);
  const leadingControlColumns = getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
    ...x,
    headerCellRender: HeaderActions,
  }));

  describe('rendering', () => {
    const sort: Sort[] = [
      {
        columnId: '@timestamp',
        columnType: 'number',
        sortDirection: Direction.desc,
      },
    ];

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );
      expect(wrapper.find('ColumnHeadersComponent')).toMatchSnapshot();
    });

    test('it renders the field browser', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="field-browser"]').first().exists()).toEqual(true);
    });

    test('it renders every column header', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );

      defaultHeaders.forEach((h) => {
        expect(wrapper.find('[data-test-subj="headers-group"]').first().text()).toContain(h.id);
      });
    });
  });

  describe('#onColumnsSorted', () => {
    let mockSort: Sort[] = [
      {
        columnId: '@timestamp',
        columnType: 'number',
        sortDirection: Direction.desc,
      },
      {
        columnId: 'host.name',
        columnType: 'text',
        sortDirection: Direction.asc,
      },
    ];
    let mockDefaultHeaders = cloneDeep(
      defaultHeaders.map((h) => (h.id === 'message' ? h : { ...h, aggregatable: true }))
    );

    beforeEach(() => {
      mockDefaultHeaders = cloneDeep(
        defaultHeaders.map((h) => (h.id === 'message' ? h : { ...h, aggregatable: true }))
      );
      mockSort = [
        {
          columnId: '@timestamp',
          columnType: 'number',
          sortDirection: Direction.desc,
        },
        {
          columnId: 'host.name',
          columnType: 'text',
          sortDirection: Direction.asc,
        },
      ];
    });

    test('Add column `event.category` as desc sorting', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-event.category"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.updateSort({
          id: timelineId,
          sort: [
            {
              columnId: '@timestamp',
              columnType: 'number',
              sortDirection: Direction.desc,
            },
            {
              columnId: 'host.name',
              columnType: 'text',
              sortDirection: Direction.asc,
            },
            { columnId: 'event.category', columnType: 'text', sortDirection: Direction.desc },
          ],
        })
      );
    });

    test('Change order of column `@timestamp` from desc to asc without changing index position', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-@timestamp"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.updateSort({
          id: timelineId,
          sort: [
            {
              columnId: '@timestamp',
              columnType: 'number',
              sortDirection: Direction.asc,
            },
            { columnId: 'host.name', columnType: 'text', sortDirection: Direction.asc },
          ],
        })
      );
    });

    test('Change order of column `host.name` from asc to desc without changing index position', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={leadingControlColumns}
            trailingControlColumns={[]}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-host.name"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockDispatch).toHaveBeenCalledWith(
        timelineActions.updateSort({
          id: timelineId,
          sort: [
            {
              columnId: '@timestamp',
              columnType: 'number',
              sortDirection: Direction.desc,
            },
            { columnId: 'host.name', columnType: 'text', sortDirection: Direction.desc },
          ],
        })
      );
    });
    test('Does not render the default leading action column header and renders a custom trailing header', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={actionsColumnWidth}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            tabType={TimelineTabs.query}
            timelineId={timelineId}
            leadingControlColumns={[]}
            trailingControlColumns={testTrailingControlColumns}
          />
        </TestProviders>
      );

      expect(wrapper.exists('[data-test-subj="field-browser"]')).toBeFalsy();
      expect(wrapper.exists('[data-test-subj="test-header-action-cell"]')).toBeTruthy();
    });
  });
});
