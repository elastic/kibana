/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { mount } from 'enzyme';
import { MockedProvider } from 'react-apollo/test-utils';
import { waitFor } from '@testing-library/react';
import { useHistory, useParams } from 'react-router-dom';

import '../../../common/mock/match_media';
import '../../../common/mock/formatted_relative';
import { SecurityPageName } from '../../../app/types';
import { TimelineType } from '../../../../common/types/timeline';

import { TestProviders, mockOpenTimelineQueryResults } from '../../../common/mock';
import { getTimelineTabsUrl } from '../../../common/components/link_to';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines_page';
import { useGetAllTimeline, getAllTimeline } from '../../containers/all';

import { useTimelineStatus } from './use_timeline_status';
import { NotePreviews } from './note_previews';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { StatefulOpenTimeline } from '.';
import { TimelineTabsStyle } from './types';
import {
  useTimelineTypes,
  UseTimelineTypesArgs,
  UseTimelineTypesResult,
} from './use_timeline_types';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');

  return {
    ...originalModule,
    useParams: jest.fn(),
    useHistory: jest.fn(),
  };
});

jest.mock('./helpers', () => {
  const originalModule = jest.requireActual('./helpers');
  return {
    ...originalModule,
    queryTimelineById: jest.fn(),
  };
});

jest.mock('../../containers/all', () => {
  const originalModule = jest.requireActual('../../containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/link_to');

jest.mock('../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineTabsUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({ formatUrl: jest.fn(), search: 'urlSearch' }),
  };
});

jest.mock('./use_timeline_status', () => {
  return {
    useTimelineStatus: jest.fn(),
  };
});

describe('StatefulOpenTimeline', () => {
  const title = 'All Timelines / Open Timelines';
  let mockHistory: History[];
  const mockInstallPrepackagedTimelines = jest.fn();

  beforeEach(() => {
    (useParams as jest.Mock).mockReturnValue({
      tabName: TimelineType.default,
      pageName: SecurityPageName.timelines,
    });
    mockHistory = [];
    (useHistory as jest.Mock).mockReturnValue(mockHistory);
    ((useGetAllTimeline as unknown) as jest.Mock).mockReturnValue({
      fetchAllTimeline: jest.fn(),
      timelines: getAllTimeline(
        '',
        mockOpenTimelineQueryResults[0].result.data?.getAllTimeline?.timeline ?? []
      ),
      loading: false,
      totalCount: mockOpenTimelineQueryResults[0].result.data.getAllTimeline.totalCount,
      refetch: jest.fn(),
    });
    ((useTimelineStatus as unknown) as jest.Mock).mockReturnValue({
      timelineStatus: null,
      templateTimelineType: null,
      templateTimelineFilter: <div />,
      installPrepackagedTimelines: mockInstallPrepackagedTimelines,
    });
    mockInstallPrepackagedTimelines.mockClear();
  });

  afterEach(() => {
    (getTimelineTabsUrl as jest.Mock).mockClear();
    (useParams as jest.Mock).mockClear();
    (useHistory as jest.Mock).mockClear();
    mockHistory = [];
  });

  test('it has the expected initial state', () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviders>
    );

    const componentProps = wrapper.find('[data-test-subj="open-timeline"]').last().props();

    expect(componentProps).toEqual({
      ...componentProps,
      itemIdToExpandedNotesRowMap: {},
      onlyFavorites: false,
      pageIndex: 0,
      pageSize: 10,
      query: '',
      selectedItems: [],
      sortDirection: 'desc',
      sortField: 'updated',
    });
  });

  describe("Template timelines' tab", () => {
    test("should land on correct timelines' tab with url timelines/default", () => {
      const { result } = renderHook<UseTimelineTypesArgs, UseTimelineTypesResult>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineType.default);
    });

    test("should land on correct timelines' tab with url timelines/template", () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: TimelineType.template,
        pageName: SecurityPageName.timelines,
      });

      const { result } = renderHook<UseTimelineTypesArgs, UseTimelineTypesResult>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineType.template);
    });

    test("should land on correct templates' tab after switching tab", () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: TimelineType.template,
        pageName: SecurityPageName.timelines,
      });

      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );
      wrapper
        .find(`[data-test-subj="timeline-${TimelineTabsStyle.tab}-${TimelineType.template}"]`)
        .first()
        .simulate('click');
      act(() => {
        expect(history.length).toBeGreaterThan(0);
      });
    });

    test("should selecting correct timelines' filter", () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: 'mockTabName',
        pageName: SecurityPageName.case,
      });

      const { result } = renderHook<UseTimelineTypesArgs, UseTimelineTypesResult>(
        () => useTimelineTypes({ defaultTimelineCount: 0, templateTimelineCount: 0 }),
        {
          wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
        }
      );

      expect(result.current.timelineType).toBe(TimelineType.default);
    });

    test('should not change url after switching filter', () => {
      (useParams as jest.Mock).mockReturnValue({
        tabName: 'mockTabName',
        pageName: SecurityPageName.case,
      });

      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={true}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );
      wrapper
        .find(
          `[data-test-subj="open-timeline-modal-body-${TimelineTabsStyle.filter}-${TimelineType.template}"]`
        )
        .first()
        .simulate('click');
      act(() => {
        expect(mockHistory.length).toEqual(0);
      });
    });
  });

  describe('#onQueryChange', () => {
    test('it updates the query state with the expected trimmed value when the user enters a query', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );
      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { key: 'Enter', target: { value: '   abcd   ' } });
      expect(wrapper.find('[data-test-subj="search-row"]').first().prop('query')).toEqual('abcd');
    });

    test('it appends the word "with" to the Showing in Timelines message when the user enters a query', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('[data-test-subj="search-bar"] input')
          .simulate('keyup', { key: 'Enter', target: { value: '   abcd   ' } });

        expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
          'Showing: 11 timelines with'
        );
      });
    });

    test('echos (renders) the query when the user enters a query', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('[data-test-subj="search-bar"] input')
          .simulate('keyup', { key: 'Enter', target: { value: '   abcd   ' } });

        expect(wrapper.find('[data-test-subj="selectable-query-text"]').first().text()).toEqual(
          'with "abcd"'
        );
      });
    });
  });

  describe('#focusInput', () => {
    test('focuses the input when the component mounts', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        expect(
          wrapper.find(`.${OPEN_TIMELINE_CLASS_NAME} input`).first().getDOMNode().id ===
            document.activeElement!.id
        ).toBe(true);
      });
    });
  });

  describe('#onAddTimelinesToFavorites', () => {
    // This functionality is hiding for now and waiting to see the light in the near future
    test.skip('it invokes addTimelinesToFavorites with the selected timelines when the button is clicked', async () => {
      const addTimelinesToFavorites = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('.euiCheckbox__input')
          .first()
          .simulate('change', { target: { checked: true } });

        wrapper.find('[data-test-subj="favorite-selected"]').first().simulate('click');

        expect(addTimelinesToFavorites).toHaveBeenCalledWith([
          'saved-timeline-11',
          'saved-timeline-10',
          'saved-timeline-9',
          'saved-timeline-8',
          'saved-timeline-6',
          'saved-timeline-5',
          'saved-timeline-4',
          'saved-timeline-3',
          'saved-timeline-2',
        ]);
      });
    });
  });

  describe('#onDeleteSelected', () => {
    // TODO - Have been skip because we need to re-implement the test as the component changed
    test.skip('it invokes deleteTimelines with the selected timelines when the button is clicked', async () => {
      const deleteTimelines = jest.fn();

      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('.euiCheckbox__input')
          .first()
          .simulate('change', { target: { checked: true } });

        wrapper.find('[data-test-subj="delete-selected"]').first().simulate('click');

        expect(deleteTimelines).toHaveBeenCalledWith([
          'saved-timeline-11',
          'saved-timeline-10',
          'saved-timeline-9',
          'saved-timeline-8',
          'saved-timeline-6',
          'saved-timeline-5',
          'saved-timeline-4',
          'saved-timeline-3',
          'saved-timeline-2',
        ]);
      });
    });
  });

  describe('#onSelectionChange', () => {
    test('it updates the selection state when timelines are selected', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper
          .find('.euiCheckbox__input')
          .first()
          .simulate('change', { target: { checked: true } });

        const selectedItems: [] = wrapper
          .find('[data-test-subj="open-timeline"]')
          .last()
          .prop('selectedItems');

        expect(selectedItems.length).toEqual(13); // 13 because we did mock 13 timelines in the query
      });
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="open-timeline"]').last().prop('sortDirection')).toEqual(
        'desc'
      );

      wrapper.find('thead tr th button').at(0).simulate('click');

      expect(wrapper.find('[data-test-subj="open-timeline"]').last().prop('sortDirection')).toEqual(
        'asc'
      );
    });
  });

  describe('#onToggleOnlyFavorites', () => {
    test('it updates the onlyFavorites state when the user clicks the Only Favorites button', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="open-timeline"]').last().prop('onlyFavorites')).toEqual(
        false
      );

      wrapper.find('[data-test-subj="only-favorites-toggle"]').first().simulate('click');

      expect(wrapper.find('[data-test-subj="open-timeline"]').last().prop('onlyFavorites')).toEqual(
        true
      );
    });
  });

  describe('#onToggleShowNotes', () => {
    test('it updates the itemIdToExpandedNotesRowMap state when the user clicks the expand notes button', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      wrapper.update();

      expect(
        wrapper.find('[data-test-subj="open-timeline"]').last().prop('itemIdToExpandedNotesRowMap')
      ).toEqual({});

      wrapper.find('[data-test-subj="expand-notes"]').first().simulate('click');

      await waitFor(() => {
        expect(
          wrapper
            .find('[data-test-subj="open-timeline"]')
            .last()
            .prop('itemIdToExpandedNotesRowMap')
        ).toEqual({
          '10849df0-7b44-11e9-a608-ab3d811609': (
            <NotePreviews
              notes={
                mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes !=
                null
                  ? mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes.map(
                      (note) => ({ ...note, savedObjectId: note.noteId })
                    )
                  : []
              }
            />
          ),
        });
      });
    });

    test('it renders the expanded notes when the expand button is clicked', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.update();

        wrapper.find('[data-test-subj="expand-notes"]').first().simulate('click');
        expect(wrapper.find('[data-test-subj="note-previews-container"]').exists()).toEqual(true);
        expect(wrapper.find('[data-test-subj="updated-by"]').exists()).toEqual(true);

        expect(
          wrapper
            .find('[data-test-subj="note-previews-container"]')
            .find('[data-test-subj="updated-by"]')
            .first()
            .text()
        ).toEqual('elastic');
      });
    });

    test('it has the expected initial state for openTimeline - templateTimelineFilter', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="open-timeline-subtabs"]').exists()).toEqual(true);
    });

    test('it has the expected initial state for openTimelineModalBody - templateTimelineFilter', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={true}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(
        wrapper
          .find(
            `[data-test-subj="open-timeline-modal-body-${TimelineTabsStyle.filter}-${TimelineType.default}"]`
          )
          .exists()
      ).toEqual(true);
    });
  });

  describe('#resetSelectionState', () => {
    test('when the user deletes selected timelines, resetSelectionState is invoked to clear the selection state', async () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              data-test-subj="stateful-timeline"
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviders>
      );
      const getSelectedItem = (): [] =>
        wrapper.find('[data-test-subj="open-timeline"]').last().prop('selectedItems');
      await waitFor(() => {
        expect(getSelectedItem().length).toEqual(0);
        wrapper
          .find('.euiCheckbox__input')
          .first()
          .simulate('change', { target: { checked: true } });
        expect(getSelectedItem().length).toEqual(13);
      });
    });
  });

  test('it renders the expected count of matching timelines when no query has been entered', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockedProvider addTypename={false}>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.update();

      expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
        'Showing: 11 timelines '
      );
    });
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onOpenTimeline with the expected parameters when the hyperlink is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviders>
    );

    await waitFor(() => {
      wrapper
        .find(
          `[data-test-subj="title-${
            mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].savedObjectId
          }"]`
        )
        .first()
        .simulate('click');

      expect(onOpenTimeline).toHaveBeenCalledWith({
        duplicate: false,
        timelineId: mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0]
          .savedObjectId,
      });
    });
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onOpenTimeline with the expected params when the button is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <TestProviders>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            data-test-subj="stateful-timeline"
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviders>
    );

    await waitFor(() => {
      wrapper.find('[data-test-subj="open-duplicate"]').first().simulate('click');

      expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
    });
  });
});
