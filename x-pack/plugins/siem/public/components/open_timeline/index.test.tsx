/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, get } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines/timelines_page';
import { mockTimelineResults } from '../../mock/timeline_results';
import { NotePreviews } from './note_previews';
import { OPEN_TIMELINE_CLASS_NAME } from './helpers';
import { StatefulOpenTimeline } from '.';
import { TimelineResult } from './types';

describe('StatefulOpenTimeline', () => {
  const title = 'All Timelines / Open Timelines';

  let mockResults: TimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it has the expected initial state', () => {
    const wrapper = mountWithIntl(
      <StatefulOpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        openTimeline={jest.fn()}
        searchResults={mockResults}
        title={title}
      />
    );

    expect(wrapper.state()).toEqual({
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
    test('it updates the query state with the expected trimmed value when the user enters a query', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('[data-test-subj="search-bar"] input')
        .simulate('keyup', { keyCode: 13, target: { value: '   abcd   ' } });

      wrapper.update();

      expect(wrapper.state()).toEqual({
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

    test('it appends the word "with" to the Showing n Timelines message when the user enters a query', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

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

    test('echos (renders) the query when the user enters a query', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

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
    test('focuses the input when the component mounts', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      expect(
        wrapper
          .find(`.${OPEN_TIMELINE_CLASS_NAME} input`)
          .first()
          .getDOMNode().id === document.activeElement!.id
      ).toBe(true);
    });
  });

  describe('#onAddTimelinesToFavorites', () => {
    test('it invokes addTimelinesToFavorites with the selected timelines when the button is clicked', () => {
      const addTimelinesToFavorites = jest.fn();

      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          addTimelinesToFavorites={addTimelinesToFavorites}
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

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
    test('it invokes deleteTimelines with the selected timelines when the button is clicked', () => {
      const deleteTimelines = jest.fn();

      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={deleteTimelines}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

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
    test('it updates the selection state when timelines are selected', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      wrapper.update();

      expect(get('selectedItems', wrapper.state()).length).toEqual(9); // 9 selectable timelines are shown on the first page of data
    });
  });

  describe('#onTableChange', () => {
    test('it updates the sort state when the user clicks on a column to sort it', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('thead tr th button')
        .at(1)
        .simulate('click');
      wrapper.update();

      expect(wrapper.state()).toEqual({
        itemIdToExpandedNotesRowMap: {},
        onlyFavorites: false,
        pageIndex: 0,
        pageSize: 10,
        search: '',
        selectedItems: [],
        sortDirection: 'asc',
        sortField: 'description',
      });
    });
  });

  describe('#onToggleOnlyFavorites', () => {
    test('it updates the onlyFavorites state when the user clicks the Only Favorites button', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('[data-test-subj="only-favorites-toggle"]')
        .first()
        .simulate('click');

      expect(wrapper.state()).toEqual({
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
    test('it updates the itemIdToExpandedNotesRowMap state when the user clicks the expand notes button', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      expect(wrapper.state()).toEqual({
        itemIdToExpandedNotesRowMap: {
          'saved-timeline-11': <NotePreviews isModal={false} notes={mockResults[0].notes} />,
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

    test('it renders the expanded notes when the expand button is clicked', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('[data-test-subj="expand-notes"]')
        .first()
        .simulate('click');

      expect(
        wrapper
          .find('[data-test-subj="note-previews-container"]')
          .find('[data-test-subj="updated-by"]')
          .first()
          .text()
      ).toEqual('alice');
    });
  });

  test('it renders the title', () => {
    const wrapper = mountWithIntl(
      <StatefulOpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        openTimeline={jest.fn()}
        searchResults={mockResults}
        title={title}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="title"]')
        .first()
        .text()
    ).toEqual(title);
  });

  describe('#resetSelectionState', () => {
    test('when the user deletes selected timelines, resetSelectionState is invoked to clear the selection state', () => {
      const wrapper = mountWithIntl(
        <StatefulOpenTimeline
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          openTimeline={jest.fn()}
          searchResults={mockResults}
          title={title}
        />
      );

      wrapper
        .find('.euiCheckbox__input')
        .first()
        .simulate('change', { target: { checked: true } });
      wrapper.update();

      wrapper
        .find('[data-test-subj="delete-selected"]')
        .first()
        .simulate('click');

      expect(get('selectedItems', wrapper.state()).length).toEqual(0);
    });
  });

  test('it renders the expected count of matching timelines when no query has been entered', () => {
    const wrapper = mountWithIntl(
      <StatefulOpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        openTimeline={jest.fn()}
        searchResults={mockResults}
        title={title}
      />
    );

    expect(
      wrapper
        .find('[data-test-subj="query-message"]')
        .first()
        .text()
    ).toContain('Showing 11 Timelines ');
  });

  test('it invokes onOpenTimeline with the expected parameters when the hyperlink is clicked', () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mountWithIntl(
      <StatefulOpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        openTimeline={onOpenTimeline}
        searchResults={mockResults}
        title={title}
      />
    );

    wrapper
      .find(`[data-test-subj="title-${mockResults[0].savedObjectId}"]`)
      .first()
      .simulate('click');

    expect(onOpenTimeline).toHaveBeenCalledWith({
      duplicate: false,
      timelineId: mockResults[0].savedObjectId,
    });
  });

  test('it invokes onOpenTimeline with the expected params when the button is clicked', () => {
    const onOpenTimeline = jest.fn();

    const wrapper = mountWithIntl(
      <StatefulOpenTimeline
        deleteTimelines={jest.fn()}
        defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
        openTimeline={onOpenTimeline}
        searchResults={mockResults}
        title={title}
      />
    );

    wrapper
      .find('[data-test-subj="open-duplicate"]')
      .first()
      .simulate('click');

    expect(onOpenTimeline).toBeCalledWith({ duplicate: true, timelineId: 'saved-timeline-11' });
  });
});
