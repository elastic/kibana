/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { Sort } from '../../sort';
import { CloseButton } from '../actions';
import { defaultHeaders } from '../default_headers';

import { HeaderComponent } from '.';
import { getNewSortDirectionOnClick, getNextSortDirection, getSortDirection } from './helpers';
import { Direction } from '../../../../../../common/search_strategy';
import { TestProviders } from '../../../../../mock';
import { tGridActions } from '../../../../../store/t_grid';
import { mockGlobalState } from '../../../../../mock/global_state';

const mockDispatch = jest.fn();
jest.mock('../../../../../hooks/use_selector', () => ({
  useShallowEqualSelector: () => mockGlobalState.timelineById.test,
  useDeepEqualSelector: () => mockGlobalState.timelineById.test,
}));

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useSelector: jest.fn(),
    useDispatch: () => mockDispatch,
  };
});

describe('Header', () => {
  const columnHeader = defaultHeaders[0];
  const sort: Sort[] = [
    {
      columnId: columnHeader.id,
      columnType: columnHeader.type ?? 'number',
      sortDirection: Direction.desc,
    },
  ];
  const timelineId = 'test';

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <TestProviders>
        <HeaderComponent header={columnHeader} sort={sort} timelineId={timelineId} />
      </TestProviders>
    );
    expect(wrapper.find('HeaderComponent').dive()).toMatchSnapshot();
  });

  describe('rendering', () => {
    test('it renders the header text', () => {
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={columnHeader} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="header-text-${columnHeader.id}"]`).first().text()
      ).toEqual(columnHeader.id);
    });

    test('it renders the header text alias when displayAsText is provided', () => {
      const displayAsText = 'Timestamp';
      const headerWithLabel = { ...columnHeader, displayAsText };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerWithLabel} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="header-text-${columnHeader.id}"]`).first().text()
      ).toEqual(displayAsText);
    });

    test('it renders the header as a `ReactNode` when `display` is provided', () => {
      const display: React.ReactNode = (
        <div data-test-subj="rendered-via-display">
          {'The display property renders the column heading as a ReactNode'}
        </div>
      );
      const headerWithLabel = { ...columnHeader, display };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerWithLabel} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.find(`[data-test-subj="rendered-via-display"]`).exists()).toBe(true);
    });

    test('it prefers to render `display` instead of `displayAsText` when both are provided', () => {
      const displayAsText = 'this text should NOT be rendered';
      const display: React.ReactNode = (
        <div data-test-subj="rendered-via-display">{'this text is rendered via display'}</div>
      );
      const headerWithLabel = { ...columnHeader, display, displayAsText };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerWithLabel} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.text()).toBe('this text is rendered via display');
    });

    test('it falls back to rendering header.id when `display` is not a valid React node', () => {
      const display = {}; // a plain object is NOT a `ReactNode`
      const headerWithLabel = { ...columnHeader, display };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerWithLabel} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="header-text-${columnHeader.id}"]`).first().text()
      ).toEqual(columnHeader.id);
    });

    test('it renders a sort indicator', () => {
      const headerSortable = { ...columnHeader, aggregatable: true };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerSortable} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-sort-indicator"]').first().exists()).toEqual(
        true
      );
    });
  });

  describe('onColumnSorted', () => {
    test('it invokes the onColumnSorted callback when the header sort button is clicked', () => {
      const headerSortable = { ...columnHeader, aggregatable: true };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerSortable} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="header-sort-button"]').first().simulate('click');

      expect(mockDispatch).toBeCalledWith(
        tGridActions.updateSort({
          id: timelineId,
          sort: [
            {
              columnId: columnHeader.id,
              columnType: columnHeader.type ?? 'number',
              sortDirection: Direction.asc, // (because the previous state was Direction.desc)
            },
          ],
        })
      );
    });

    test('it does NOT render the header sort button when aggregatable is false', () => {
      const headerSortable = { ...columnHeader, aggregatable: false };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerSortable} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-sort-button"]').length).toEqual(0);
    });

    test('it does NOT render the header sort button when aggregatable is missing', () => {
      const headerSortable = { ...columnHeader };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerSortable} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-sort-button"]').length).toEqual(0);
    });

    test('it does NOT invoke the onColumnSorted callback when the header is clicked and aggregatable is undefined', () => {
      const mockOnColumnSorted = jest.fn();
      const headerSortable = { ...columnHeader, aggregatable: undefined };
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={headerSortable} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      wrapper.find(`[data-test-subj="header-${columnHeader.id}"]`).first().simulate('click');

      expect(mockOnColumnSorted).not.toHaveBeenCalled();
    });
  });

  describe('CloseButton', () => {
    test('it invokes the onColumnRemoved callback with the column ID when the close button is clicked', () => {
      const mockOnColumnRemoved = jest.fn();

      const wrapper = mount(
        <CloseButton columnId={columnHeader.id} onColumnRemoved={mockOnColumnRemoved} />
      );

      wrapper.find('[data-test-subj="remove-column"]').first().simulate('click');

      expect(mockOnColumnRemoved).toBeCalledWith(columnHeader.id);
    });
  });

  describe('getSortDirection', () => {
    test('it returns the sort direction when the header id matches the sort column id', () => {
      expect(getSortDirection({ header: columnHeader, sort })).toEqual(sort[0].sortDirection);
    });

    test('it returns "none" when sort direction when the header id does NOT match the sort column id', () => {
      const nonMatching: Sort[] = [
        {
          columnId: 'differentSocks',
          columnType: columnHeader.type ?? 'number',
          sortDirection: Direction.desc,
        },
      ];

      expect(getSortDirection({ header: columnHeader, sort: nonMatching })).toEqual('none');
    });
  });

  describe('getNextSortDirection', () => {
    test('it returns "asc" when the current direction is "desc"', () => {
      const sortDescending: Sort = {
        columnId: columnHeader.id,
        columnType: columnHeader.type ?? 'number',
        sortDirection: Direction.desc,
      };

      expect(getNextSortDirection(sortDescending)).toEqual('asc');
    });

    test('it returns "desc" when the current direction is "asc"', () => {
      const sortAscending: Sort = {
        columnId: columnHeader.id,
        columnType: columnHeader.type ?? 'number',
        sortDirection: Direction.asc,
      };

      expect(getNextSortDirection(sortAscending)).toEqual(Direction.desc);
    });

    test('it returns "desc" by default', () => {
      const sortNone: Sort = {
        columnId: columnHeader.id,
        columnType: columnHeader.type ?? 'number',
        sortDirection: 'none',
      };

      expect(getNextSortDirection(sortNone)).toEqual(Direction.desc);
    });
  });

  describe('getNewSortDirectionOnClick', () => {
    test('it returns the expected new sort direction when the header id matches the sort column id', () => {
      const sortMatches: Sort[] = [
        {
          columnId: columnHeader.id,
          columnType: columnHeader.type ?? 'number',
          sortDirection: Direction.desc,
        },
      ];

      expect(
        getNewSortDirectionOnClick({
          clickedHeader: columnHeader,
          currentSort: sortMatches,
        })
      ).toEqual(Direction.asc);
    });

    test('it returns the expected new sort direction when the header id does NOT match the sort column id', () => {
      const sortDoesNotMatch: Sort[] = [
        {
          columnId: 'someOtherColumn',
          columnType: columnHeader.type ?? 'number',
          sortDirection: 'none',
        },
      ];

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
          <HeaderComponent header={columnHeader} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="header-text-${columnHeader.id}"]`).at(1)
      ).toHaveStyleRule('text-overflow', 'ellipsis');
    });
  });

  describe('header tooltip', () => {
    test('it has a tooltip to display the properties of the field', () => {
      const wrapper = mount(
        <TestProviders>
          <HeaderComponent header={columnHeader} sort={sort} timelineId={timelineId} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="header-tooltip"]').exists()).toEqual(true);
    });
  });
});
