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

describe('ColumnHeaders', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: Direction.desc,
    };

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
          />
        </TestProviders>
      );
      expect(wrapper.find('ColumnHeadersComponent')).toMatchSnapshot();
    });

    test('it renders the field browser', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeadersComponent
            actionsColumnWidth={DEFAULT_ACTIONS_COLUMN_WIDTH}
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            isSelectAllChecked={false}
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
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
            onSelectAll={jest.fn}
            showEventsSelect={false}
            showSelectAllCheckbox={false}
            sort={sort}
            timelineId={'test'}
          />
        </TestProviders>
      );

      defaultHeaders.forEach((h) => {
        expect(wrapper.find('[data-test-subj="headers-group"]').first().text()).toContain(h.id);
      });
    });
  });
});
