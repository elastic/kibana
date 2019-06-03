/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import { get } from 'lodash/fp';
import { MockedProvider } from 'react-apollo/test-utils';
import * as React from 'react';

import { wait } from '../../lib/helpers';
import { TestProviderWithoutDragAndDrop, apolloClient } from '../../mock/test_providers';
import { mockOpenTimelineQueryResults } from '../../mock/timeline_results';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines/timelines_page';

import { StatefulOpenTimeline } from '.';
import { NotePreviews } from './note_previews';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';

const getStateChildComponent = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapper: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
React.Component<{}, {}, any> =>
  wrapper
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .childAt(0)
    .instance();

describe('StatefulOpenTimeline', () => {
  const title = 'All Timelines / Open Timelines';

  test('it has the expected initial state', async () => {
    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviderWithoutDragAndDrop>
    );

    await wait();
    wrapper.update();

    expect(getStateChildComponent(wrapper).state).toEqual({
      itemIdToExpandedNotesRowMap: {},
      onlyFavorites: false,
      pageIndex: 0,
      pageSize: 10,
      search: '',
      selectedItems: [],
      sortDirection: 'desc',
      sortField: 'updated',
    });
  });

  describe('#onQueryChange', () => {
    test('it updates the query state with the expected trimmed value when the user enters a query', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();
      wrapper.update();

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      wrapper.update();

      expect(getStateChildComponent(wrapper).state).toEqual({
        itemIdToExpandedNotesRowMap: {},
        onlyFavorites: false,
        pageIndex: 0,
        pageSize: 10,
        search: 'abcd',
        selectedItems: [],
        sortDirection: 'desc',
        sortField: 'updated',
      });
    });

    test('it appends the word "with" to the Showing in Timelines message when the user enters a query', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="query-message"]')
          .first()
          .text()
      ).toContain('Showing 11 Timelines with');
    });

    test('echos (renders) the query when the user enters a query', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="selectable-query-text"]')
          .first()
          .text()
      ).toEqual('abcd');
    });
  });

  describe('#focusInput', () => {
    test('focuses the input when the component mounts', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      expect(
        wrapper
          .find(`.${OPEN_TIMELINE_CLASS_NAME} input`)
          .first()
          .getDOMNode().id === document.activeElement!.id
      ).toBe(true);
    });
  });

  describe('#onAddTimelinesToFavorites', () => {
    // This functionality is hiding for now and waiting to see the light in the near future
    test.skip('it invokes addTimelinesToFavorites with the selected timelines when the button is clicked', async () => {
      const addTimelinesToFavorites = jest.fn();

      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      wrapper.update();

      wrapper
        .find('[data-test-subj="favorite-selected"]')
        .first()
        .simulate('click');

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

  describe('#onDeleteSelected', () => {
    // TODO - Have been skip because we need to re-implement the test as the component changed
    test.skip('it invokes deleteTimelines with the selected timelines when the button is clicked', async () => {
      const deleteTimelines = jest.fn();

      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      wrapper.update();

      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');

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

  describe('#onSelectionChange', () => {
    test('it updates the selection state when timelines are selected', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });

      wrapper.update();

      expect(get('selectedItems', getStateChildComponent(wrapper).state).length).toEqual(13); // 13 because we did mock 13 timelines in the query
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('thead tr th button')
        .at(0)
        .simulate('click');

      wrapper.update();

      expect(getStateChildComponent(wrapper).state).toEqual({
        itemIdToExpandedNotesRowMap: {},
        onlyFavorites: false,
        pageIndex: 0,
        pageSize: 10,
        search: '',
        selectedItems: [],
        sortDirection: 'asc',
        sortField: 'updated',
      });
    });
  });

  describe('#onToggleOnlyFavorites', () => {
    test('it updates the onlyFavorites state when the user clicks the Only Favorites button', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(getStateChildComponent(wrapper).state).toEqual({
        itemIdToExpandedNotesRowMap: {},
        onlyFavorites: true,
        pageIndex: 0,
        pageSize: 10,
        search: '',
        selectedItems: [],
        sortDirection: 'desc',
        sortField: 'updated',
      });
    });
  });

  describe('#onToggleShowNotes', () => {
    test('it updates the itemIdToExpandedNotesRowMap state when the user clicks the expand notes button', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      wrapper.update();
      expect(getStateChildComponent(wrapper).state).toEqual({
        itemIdToExpandedNotesRowMap: {
          '10849df0-7b44-11e9-a608-ab3d811609': (
            <NotePreviews
              isModal={false}
              notes={
                mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes !=
                null
                  ? mockOpenTimelineQueryResults[0].result.data!.getAllTimeline.timeline[0].notes.map(
                      note => ({ ...note, savedObjectId: note.noteId })
                    )
                  : []
              }
            />
          ),
        },
        onlyFavorites: false,
        pageIndex: 0,
        pageSize: 10,
        search: '',
        selectedItems: [],
        sortDirection: 'desc',
        sortField: 'updated',
      });
    });

    test('it renders the expanded notes when the expand button is clicked', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(
        wrapper
          .find('[data-test-subj="note-previews-container"]')
          .find('[data-test-subj="updated-by"]')
          .first()
          .text()
      ).toEqual('elastic');
    });
  });

  test('it renders the title', async () => {
    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviderWithoutDragAndDrop>
    );

    await wait();

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual(title);
  });

  describe('#resetSelectionState', () => {
    test('when the user deletes selected timelines, resetSelectionState is invoked to clear the selection state', async () => {
      const wrapper = mount(
        <TestProviderWithoutDragAndDrop>
          <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
            <StatefulOpenTimeline
              apolloClient={apolloClient}
              isModal={false}
              defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
              title={title}
            />
          </MockedProvider>
        </TestProviderWithoutDragAndDrop>
      );

      await wait();

      wrapper.update();

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      wrapper.update();

      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');

      wrapper.update();

      expect(get('selectedItems', getStateChildComponent(wrapper).state).length).toEqual(0);
    });
  });

  test('it renders the expected count of matching timelines when no query has been entered', async () => {
    const wrapper = mount(
      <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
        <TestProviderWithoutDragAndDrop>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </TestProviderWithoutDragAndDrop>
      </MockedProvider>
    );

    await wait();

    wrapper.update();

    expect(
      wrapper
        .find('[data-test-subj="query-message"]')
        .first()
        .text()
    ).toContain('Showing 11 Timelines ');
  });

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onOpenTimeline with the expected parameters when the hyperlink is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviderWithoutDragAndDrop>
    );

    await wait();

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

  // TODO - Have been skip because we need to re-implement the test as the component changed
  test.skip('it invokes onOpenTimeline with the expected params when the button is clicked', async () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mount(
      <TestProviderWithoutDragAndDrop>
        <MockedProvider mocks={mockOpenTimelineQueryResults} addTypename={false}>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            isModal={false}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            title={title}
          />
        </MockedProvider>
      </TestProviderWithoutDragAndDrop>
    );

    await wait();

    wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .simulate('click');

    expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });
});
