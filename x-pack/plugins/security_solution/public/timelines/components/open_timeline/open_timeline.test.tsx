/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { cloneDeep } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import '../../../common/mock/match_media';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines_page';
import { OpenTimelineResult, OpenTimelineProps } from './types';
import { TimelinesTableProps } from './timelines_table';
import { mockTimelineResults } from '../../../common/mock/timeline_results';
import { OpenTimeline } from './open_timeline';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from './constants';
import { TimelineType } from '../../../../common/types/timeline';

jest.mock('../../../common/lib/kibana');

describe('OpenTimeline', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const title = 'All Timelines / Open Timelines';

  let mockResults: OpenTimelineResult[];

  const getDefaultTestProps = (mockSearchResults: OpenTimelineResult[]): OpenTimelineProps => ({
    deleteTimelines: jest.fn(),
    defaultPageSize: DEFAULT_SEARCH_RESULTS_PER_PAGE,
    isLoading: false,
    itemIdToExpandedNotesRowMap: {},
    onAddTimelinesToFavorites: jest.fn(),
    onDeleteSelected: jest.fn(),
    onlyFavorites: false,
    onOpenTimeline: jest.fn(),
    onQueryChange: jest.fn(),
    onSelectionChange: jest.fn(),
    onTableChange: jest.fn(),
    onToggleOnlyFavorites: jest.fn(),
    onToggleShowNotes: jest.fn(),
    pageIndex: 0,
    pageSize: DEFAULT_SEARCH_RESULTS_PER_PAGE,
    query: '',
    searchResults: mockSearchResults,
    selectedItems: [],
    sortDirection: DEFAULT_SORT_DIRECTION,
    sortField: DEFAULT_SORT_FIELD,
    title,
    timelineType: TimelineType.default,
    templateTimelineFilter: [<div />],
    totalSearchResultsCount: mockSearchResults.length,
  });

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the search row', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="search-row"]').first().exists()).toBe(true);
  });

  test('it renders the timelines table', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="timelines-table"]').first().exists()).toBe(true);
  });

  test('it shows the delete action columns when onDeleteSelected and deleteTimelines are specified', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.actionTimelineToShow).toContain('delete');
  });

  test('it does NOT show the delete action columns when is onDeleteSelected undefined and deleteTimelines is specified', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      onDeleteSelected: undefined,
      deleteTimelines: undefined,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.actionTimelineToShow).not.toContain('delete');
  });

  test('it does NOT show the delete action columns when is onDeleteSelected provided and deleteTimelines is undefined', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      onDeleteSelected: undefined,
      deleteTimelines: undefined,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.actionTimelineToShow).not.toContain('delete');
  });

  test('it does NOT show the delete action when both onDeleteSelected and deleteTimelines are undefined', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      onDeleteSelected: undefined,
      deleteTimelines: undefined,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    const props = wrapper
      .find('[data-test-subj="timelines-table"]')
      .first()
      .props() as TimelinesTableProps;

    expect(props.actionTimelineToShow).not.toContain('delete');
  });

  test('it renders an empty string when the query is an empty string', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: '',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selectable-query-text"]').first().text()).toEqual('');
  });

  test('it renders the expected message when the query just has spaces', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: '   ',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selectable-query-text"]').first().text()).toEqual('');
  });

  test('it echos the query when the query has non-whitespace characters', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: 'Would you like to go to Denver?',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selectable-query-text"]').first().text()).toContain(
      'Would you like to go to Denver?'
    );
  });

  test('trims whitespace from the ends of the query', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: '   Is it starting to feel cramped in here?   ',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selectable-query-text"]').first().text()).toContain(
      'Is it starting to feel cramped in here?'
    );
  });

  test('it renders the expected message when the query is an empty string', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: '',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
      `Showing: ${mockResults.length} timelines `
    );
  });

  test('it renders the expected message when the query just has whitespace', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: '   ',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
      `Showing: ${mockResults.length} timelines `
    );
  });

  test('it includes the word "with" when the query has non-whitespace characters', () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      query: 'How was your day?',
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
      `Showing: ${mockResults.length} timelines with "How was your day?"`
    );
  });
});
