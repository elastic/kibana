/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import 'jest-styled-components';
import * as React from 'react';
import { TestProviders } from 'x-pack/plugins/secops/public/mock/test_providers';

import { Direction } from '../../../../../graphql/types';
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
    sortDirection: Direction.descending,
  };
  const timelineId = 'fakeId';

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
        sortDirection: 'ascending', // (because the previous state was Direction.descending)
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
        sortDirection: Direction.descending,
      };

      expect(getSortDirection({ header: columnHeader, sort: nonMatching })).toEqual('none');
    });
  });

  describe('getNextSortDirection', () => {
    test('it returns "ascending" when the current direction is "descending"', () => {
      const sortDescending: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.descending,
      };

      expect(getNextSortDirection(sortDescending)).toEqual('ascending');
    });

    test('it returns "descending" when the current direction is "ascending"', () => {
      const sortAscending: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.ascending,
      };

      expect(getNextSortDirection(sortAscending)).toEqual(Direction.descending);
    });

    test('it returns "descending" by default', () => {
      const sortNone: Sort = {
        columnId: columnHeader.id,
        sortDirection: 'none',
      };

      expect(getNextSortDirection(sortNone)).toEqual(Direction.descending);
    });
  });

  describe('getNewSortDirectionOnClick', () => {
    test('it returns the expected new sort direction when the header id matches the sort column id', () => {
      const sortMatches: Sort = {
        columnId: columnHeader.id,
        sortDirection: Direction.descending,
      };

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortMatches,
        })
      ).toEqual(Direction.ascending);
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
      ).toEqual(Direction.descending);
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
