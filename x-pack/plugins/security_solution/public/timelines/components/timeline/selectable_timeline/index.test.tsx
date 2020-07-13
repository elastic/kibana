/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow, ShallowWrapper, mount } from 'enzyme';
import { TimelineType } from '../../../../../common/types/timeline';
import { SortFieldTimeline, Direction } from '../../../../graphql/types';
import { SearchProps } from './';

describe('SelectableTimeline', () => {
  const mockFetchAllTimeline = jest.fn();
  const mockEuiSelectable = jest.fn();

  jest.doMock('@elastic/eui', () => {
    const originalModule = jest.requireActual('@elastic/eui');
    return {
      ...originalModule,
      EuiSelectable: mockEuiSelectable.mockImplementation(({ children }) => <div>{children}</div>),
    };
  });

  jest.doMock('../../../containers/all', () => {
    return {
      useGetAllTimeline: jest.fn(() => ({
        fetchAllTimeline: mockFetchAllTimeline,
        timelines: [],
      })),
    };
  });

  const { SelectableTimeline, ORIGINAL_PAGE_SIZE } = jest.requireActual('./');

  const props = {
    hideUntitled: false,
    getSelectableOptions: jest.fn(),
    onClosePopover: jest.fn(),
    onTimelineChange: jest.fn(),
    timelineType: TimelineType.default,
  };

  describe('should render', () => {
    let wrapper: ShallowWrapper;

    describe('timeline', () => {
      beforeAll(() => {
        wrapper = shallow(<SelectableTimeline {...props} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', () => {
        const searchProps: SearchProps = wrapper
          .find('[data-test-subj="selectable-input"]')
          .prop('searchProps');
        expect(searchProps.placeholder).toEqual('e.g. Timeline name or description');
      });
    });

    describe('timeline template', () => {
      const templateTimelineProps = { ...props, timelineType: TimelineType.template };
      beforeAll(() => {
        wrapper = shallow(<SelectableTimeline {...templateTimelineProps} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('render placeholder', () => {
        const searchProps: SearchProps = wrapper
          .find('[data-test-subj="selectable-input"]')
          .prop('searchProps');
        expect(searchProps.placeholder).toEqual('e.g. Timeline template name or description');
      });
    });
  });

  describe('fetchAllTimeline', () => {
    const args = {
      pageInfo: {
        pageIndex: 1,
        pageSize: ORIGINAL_PAGE_SIZE,
      },
      search: '',
      sort: {
        sortField: SortFieldTimeline.updated,
        sortOrder: Direction.desc,
      },
      status: null,
      onlyUserFavorite: false,
      timelineType: TimelineType.default,
      templateTimelineType: null,
    };
    beforeAll(() => {
      mount(<SelectableTimeline {...props} />);
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('shoule be called with correct args', () => {
      expect(mockFetchAllTimeline).toBeCalledWith(args);
    });
  });
});
