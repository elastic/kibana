/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../../common/mock/match_media';
import { DEFAULT_ACTIONS_COLUMN_WIDTH } from '../constants';
import { defaultHeaders } from './default_headers';
import { Direction } from '../../../../../graphql/types';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { Sort } from '../sort';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { ColumnHeadersComponent } from '.';
import { cloneDeep } from 'lodash/fp';

describe('ColumnHeaders', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    const sort: Sort[] = [
      {
        columnId: '@timestamp',
        sortDirection: Direction.desc,
      },
    ];

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the field browser', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="field-browser"]').first().exists()).toEqual(true);
    });

    test('it renders every column header', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
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
        sortDirection: Direction.desc,
      },
      {
        columnId: 'host.name',
        sortDirection: Direction.asc,
      },
    ];
    let mockDefaultHeaders = cloneDeep(
      defaultHeaders.map((h) => (h.id === 'message' ? h : { ...h, aggregatable: true }))
    );
    const mockOnColumnsSorted = jest.fn();

    beforeEach(() => {
      mockOnColumnsSorted.mockReset();
      mockDefaultHeaders = cloneDeep(
        defaultHeaders.map((h) => (h.id === 'message' ? h : { ...h, aggregatable: true }))
      );
      mockSort = [
        {
          columnId: '@timestamp',
          sortDirection: Direction.desc,
        },
        {
          columnId: 'host.name',
          sortDirection: Direction.asc,
        },
      ];
    });

    test('Add column `event.category` as desc sorting', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={mockOnColumnsSorted}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-event.category"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockOnColumnsSorted).toHaveBeenCalledWith([
        { columnId: '@timestamp', sortDirection: 'desc' },
        { columnId: 'host.name', sortDirection: 'asc' },
        { columnId: 'event.category', sortDirection: 'desc' },
      ]);
    });

    test('Change order of column `@timestamp` from desc to asc without changing index position', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={mockOnColumnsSorted}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-@timestamp"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockOnColumnsSorted).toHaveBeenCalledWith([
        { columnId: '@timestamp', sortDirection: 'asc' },
        { columnId: 'host.name', sortDirection: 'asc' },
      ]);
    });

    test('Change order of column `host.name` from asc to desc without changing index position', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={mockDefaultHeaders}
            isSelectAllChecked={false}
            onColumnsSorted={mockOnColumnsSorted}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onSelectAll={jest.fn}
            onUpdateColumns={jest.fn()}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={mockSort}
            timelineId={'test'}
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header-host.name"] [data-test-subj="header-sort-button"]')
        .first()
        .simulate('click');
      expect(mockOnColumnsSorted).toHaveBeenCalledWith([
        { columnId: '@timestamp', sortDirection: 'desc' },
        { columnId: 'host.name', sortDirection: 'desc' },
      ]);
    });
  });
});
