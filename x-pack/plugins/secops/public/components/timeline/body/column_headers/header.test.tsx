/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { Sort } from '../sort/sort';
import { SORT_DIRECTION_DESCENDING } from '../sort/sort_indicator';
import { ColumnHeader } from './column_header';
import {
  getNewSortDirectionOnClick,
  getNextSortDirection,
  getSortDirection,
  Header,
} from './header';

describe('Header', () => {
  const columnHeader: ColumnHeader = {
    columnHeaderType: 'text-filter',
    id: 'foobar',
    minWidth: 100,
    text: 'Foobar',
  };
  const sort: Sort = {
    columnId: columnHeader.id,
    sortDirection: 'descending',
  };

  describe('rendering', () => {
    test('it renders the header text', () => {
      const wrapper = mount(<Header sort={sort} header={columnHeader} />);

      expect(wrapper.find('[data-test-subj="headerText"]').text()).toEqual(columnHeader.text);
    });

    test('it renders a sort indicator', () => {
      const wrapper = mount(<Header sort={sort} header={columnHeader} />);

      expect(wrapper.find('[data-test-subj="sortIndicator"]').text()).toEqual(
        SORT_DIRECTION_DESCENDING
      );
    });

    test('it renders a filter', () => {
      const wrapper = mount(<Header sort={sort} header={columnHeader} />);

      expect(wrapper.find('[data-test-subj="textFilter"]').props()).toHaveProperty('placeholder');
    });

    describe('minWidth', () => {
      test('it applies the value of the minWidth prop to the headerContainer', () => {
        const wrapper = mount(<Header sort={sort} header={columnHeader} />);

        expect(wrapper.find('[data-test-subj="headerContainer"]').prop('style')).toHaveProperty(
          'minWidth',
          `${columnHeader.minWidth}px`
        );
      });
    });
  });

  describe('onColumnSorted', () => {
    test('it invokes the onColumnSorted callback when the header is clicked', () => {
      const mockOnColumnSorted = jest.fn();

      const wrapper = mount(
        <Header onColumnSorted={mockOnColumnSorted} sort={sort} header={columnHeader} />
      );

      wrapper.find('[data-test-subj="header"]').simulate('click');

      expect(mockOnColumnSorted).toBeCalledWith({
        columnId: columnHeader.id,
        sortDirection: 'ascending', // (because the previous state was 'descending')
      });
    });
  });

  describe('getSortDirection', () => {
    test('it returns the sort direction when the header id matches the sort column id', () => {
      expect(getSortDirection({ header: columnHeader, sort })).toEqual(sort.sortDirection);
    });

    test('it returns "none" when sort direction when the header id does NOT match the sort column id', () => {
      const nonMatching: Sort = {
        columnId: 'differentSocks',
        sortDirection: 'descending',
      };

      expect(getSortDirection({ header: columnHeader, sort: nonMatching })).toEqual('none');
    });
  });

  describe('getNextSortDirection', () => {
    test('it returns "ascending" when the current direction is "descending"', () => {
      const sortDescending: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'descending',
      };

      expect(getNextSortDirection(sortDescending)).toEqual('ascending');
    });

    test('it returns "descending" when the current direction is "ascending"', () => {
      const sortAscending: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'ascending',
      };

      expect(getNextSortDirection(sortAscending)).toEqual('descending');
    });

    test('it returns "descending" by default', () => {
      const sortNone: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'none',
      };

      expect(getNextSortDirection(sortNone)).toEqual('descending');
    });
  });

  describe('getNewSortDirectionOnClick', () => {
    test('it returns the expected new sort direction when the header id matches the sort column id', () => {
      const sortMatches: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'descending',
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortMatches,
        })
      ).toEqual('ascending');
    });

    test('it returns the expected new sort direction when the header id does NOT match the sort column id', () => {
      const sortDoesNotMatch: Sort = {
        columnId: 'someOtherColumn',
        sortDirection: 'none',
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortDoesNotMatch,
        })
      ).toEqual('descending');
    });
  });
});
