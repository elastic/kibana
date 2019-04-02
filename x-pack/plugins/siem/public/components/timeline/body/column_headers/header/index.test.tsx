/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import 'jest-styled-components';
import * as React from 'react';

import { Direction } from '../../../../../graphql/types';
import { TestProviders } from '../../../../../mock';
import { Sort } from '../../sort';
import { CloseButton } from '../actions';
import { ColumnHeaderType } from '../column_header';
import { defaultHeaders } from '../default_headers';

import { Header } from '.';
import { getNewSortDirectionOnClick, getNextSortDirection, getSortDirection } from './helpers';

const filteredColumnHeader: ColumnHeaderType = 'text-filter';

describe('Header', () => {
  const columnHeader = defaultHeaders[0];
  const sort: Sort = {
    columnId: columnHeader.id,
    sortDirection: Direction.desc,
  };
  const timelineId = 'fakeId';

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <Header
        header={columnHeader}
        isLoading={false}
        onColumnRemoved={jest.fn()}
        onColumnResized={jest.fn()}
        onColumnSorted={jest.fn()}
        sort={sort}
        timelineId={timelineId}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('rendering', () => {
    test('it renders the header text', () => {
      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnHeader}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="header-text"]')
          .first()
          .text()
      ).toEqual(columnHeader.id);
    });

    test('it renders a sort indicator', () => {
      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnHeader}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="sortIndicator"]')
          .first()
          .prop('type')
      ).toEqual('sortDown');
    });

    test('it renders a filter', () => {
      const columnWithFilter = {
        ...columnHeader,
        columnHeaderType: filteredColumnHeader,
      };

      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnWithFilter}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="textFilter"]')
          .first()
          .props()
      ).toHaveProperty('placeholder');
    });

    describe('minWidth', () => {
      test('it applies the value of the width prop to the HeaderContainer', () => {
        const wrapper = mount(
          <TestProviders>
            <Header
              header={columnHeader}
              isLoading={false}
              onColumnRemoved={jest.fn()}
              onColumnResized={jest.fn()}
              onColumnSorted={jest.fn()}
              sort={sort}
              timelineId={timelineId}
            />
          </TestProviders>
        );
        expect(
          wrapper
            .find('[data-test-subj="header-container"]')
            .first()
            .props()
        ).toHaveProperty('width', `${columnHeader.width}px`);
      });
    });
  });

  describe('onColumnSorted', () => {
    test('it invokes the onColumnSorted callback when the header is clicked', () => {
      const mockOnColumnSorted = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnHeader}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={mockOnColumnSorted}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="header"]')
        .first()
        .simulate('click');

      expect(mockOnColumnSorted).toBeCalledWith({
        columnId: columnHeader.id,
        sortDirection: 'asc', // (because the previous state was Direction.desc)
      });
    });
  });

  describe('CloseButton', () => {
    test('it invokes the onColumnRemoved callback with the column ID when the close button is clicked', () => {
      const mockOnColumnRemoved = jest.fn();

      const wrapper = mount(
        <CloseButton columnId={columnHeader.id} show={true} onColumnRemoved={mockOnColumnRemoved} />
      );

      wrapper
        .find('[data-test-subj="remove-column"]')
        .first()
        .simulate('click');

      expect(mockOnColumnRemoved).toBeCalledWith(columnHeader.id);
    });
  });

  describe('getSortDirection', () => {
    test('it returns the sort direction when the header id matches the sort column id', () => {
      expect(getSortDirection({ header: columnHeader, sort })).toEqual(sort.sortDirection);
    });

    test('it returns "none" when sort direction when the header id does NOT match the sort column id', () => {
      const nonMatching: Sort = {
        columnId: 'differentSocks',
        sortDirection: Direction.desc,
      };

      expect(getSortDirection({ header: columnHeader, sort: nonMatching })).toEqual('none');
    });
  });

  describe('getNextSortDirection', () => {
    test('it returns "asc" when the current direction is "desc"', () => {
      const sortDescending: Sort = { columnId: columnHeader.id, sortDirection: Direction.desc };

      expect(getNextSortDirection(sortDescending)).toEqual('asc');
    });

    test('it returns "desc" when the current direction is "asc"', () => {
      const sortAscending: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.asc,
      };

      expect(getNextSortDirection(sortAscending)).toEqual(Direction.desc);
    });

    test('it returns "desc" by default', () => {
      const sortNone: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'none',
      };

      expect(getNextSortDirection(sortNone)).toEqual(Direction.desc);
    });
  });

  describe('getNewSortDirectionOnClick', () => {
    test('it returns the expected new sort direction when the header id matches the sort column id', () => {
      const sortMatches: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.desc,
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortMatches,
        })
      ).toEqual(Direction.asc);
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
      ).toEqual(Direction.desc);
    });
  });

  describe('text truncation styling', () => {
    test('truncates the header text with an ellipsis', () => {
      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnHeader}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-text"]')).toHaveStyleRule(
        'text-overflow',
        'ellipsis'
      );
    });
  });

  describe('header tooltip', () => {
    test('it has a tooltip to display the properties of the field', () => {
      const wrapper = mount(
        <TestProviders>
          <Header
            header={columnHeader}
            isLoading={false}
            onColumnRemoved={jest.fn()}
            onColumnResized={jest.fn()}
            onColumnSorted={jest.fn()}
            sort={sort}
            timelineId={timelineId}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-tooltip"]').exists()).toEqual(true);
    });
  });
});
