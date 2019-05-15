/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Direction } from '../../../../graphql/types';
import { TestProviders } from '../../../../mock/test_providers';
import { ACTIONS_COLUMN_WIDTH } from '../helpers';
import { Sort } from '../sort';

import { ColumnHeaders } from '.';
import { defaultHeaders } from './default_headers';

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    const sort: Sort = {
      columnId: 'fooColumn',
      sortDirection: Direction.desc,
    };

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <ColumnHeaders
          actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
          columnHeaders={defaultHeaders}
          isLoading={false}
          minWidth={1000}
          onColumnSorted={jest.fn()}
          onColumnRemoved={jest.fn()}
          onColumnResized={jest.fn()}
          sort={sort}
          timelineId={'test'}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the field browser', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeaders
            actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
            columnHeaders={defaultHeaders}
            isLoading={false}
            minWidth={1000}
            onColumnSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            sort={sort}
            timelineId={'test'}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="field-browser"]')
          .first()
          .exists()
      ).toEqual(true);
    });

    test('it renders every column header', () => {
      const wrapper = mount(
        <TestProviders>
          <ColumnHeaders
            actionsColumnWidth={ACTIONS_COLUMN_WIDTH}
            columnHeaders={defaultHeaders}
            isLoading={false}
            minWidth={1000}
            onColumnSorted={jest.fn()}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            sort={sort}
            timelineId={'test'}
          />
        </TestProviders>
      );

      defaultHeaders.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="headers-group"]')
            .first()
            .text()
        ).toContain(h.id);
      });
    });
  });
});
