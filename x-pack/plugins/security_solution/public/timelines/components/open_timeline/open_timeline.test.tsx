/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { waitFor } from '@testing-library/react';

import '../../../common/mock/match_media';
import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../pages/timelines_page';
import { OpenTimelineResult, OpenTimelineProps } from './types';
import { TimelinesTableProps } from './timelines_table';
import { mockTimelineResults } from '../../../common/mock/timeline_results';
import { OpenTimeline } from './open_timeline';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from './constants';
import { TimelineType, TimelineStatus } from '../../../../common/types/timeline';
import { getMockTheme } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('../../../common/lib/kibana');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');

  return {
    ...actual,
    useParams: jest.fn().mockReturnValue({ tabName: 'default' }),
  };
});

const mockTheme = getMockTheme({
  eui: {
    euiSizeL: '10px',
    paddingSizes: {
      s: '10px',
    },
    euiBreakpoints: {
      l: '1200px',
    },
  },
});

describe('OpenTimeline', () => {
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
    timelineStatus: TimelineStatus.active,
    templateTimelineFilter: [<div key="mock-a" />, <div key="mock-b" />],
    totalSearchResultsCount: mockSearchResults.length,
  });

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  test('it renders the search row', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="search-row"]').first().exists()).toBe(true);
  });

  test('it renders the timelines table', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="timelines-table"]').first().exists()).toBe(true);
  });

  test('it shows the delete action columns when onDeleteSelected and deleteTimelines are specified', () => {
    const defaultProps = getDefaultTestProps(mockResults);
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
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
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="query-message"]').first().text()).toContain(
      `Showing: ${mockResults.length} timelines with "How was your day?"`
    );
  });

  test("it should render bulk actions if timelineStatus is active (selecting custom templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.active,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="utility-bar-action"]').exists()).toEqual(true);
  });

  test('it should disable export-timeline if no timeline is selected', async () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
      selectedItems: [],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="utility-bar-action"]').find('EuiLink').simulate('click');
    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="export-timeline-action"]').first().prop('disabled')
      ).toEqual(true);
    });
  });

  test('it should disable delete timeline if no timeline is selected', async () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
      selectedItems: [],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="utility-bar-action"]').find('EuiLink').simulate('click');
    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="delete-timeline-action"]').first().prop('disabled')
      ).toEqual(true);
    });
  });

  test('it should enable export-timeline if a timeline is selected', async () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
      selectedItems: [{}],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="utility-bar-action"]').find('EuiLink').simulate('click');
    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="export-timeline-action"]').first().prop('disabled')
      ).toEqual(false);
    });
  });

  test('it should enable delete timeline if a timeline is selected', async () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
      selectedItems: [{}],
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    wrapper.find('[data-test-subj="utility-bar-action"]').find('EuiLink').simulate('click');
    await waitFor(() => {
      expect(
        wrapper.find('[data-test-subj="delete-timeline-action"]').first().prop('disabled')
      ).toEqual(false);
    });
  });

  test("it should render a selectable timeline table if timelineStatus is active (selecting custom templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.active,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="timelines-table"]').first().prop('actionTimelineToShow')
    ).toEqual(['createFrom', 'duplicate', 'export', 'selectable', 'delete']);
  });

  test("it should render selected count if timelineStatus is active (selecting custom templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.active,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selected-count"]').exists()).toEqual(true);
  });

  test("it should not render bulk actions if timelineStatus is immutable (selecting Elastic templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.immutable,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="utility-bar-action"]').exists()).toEqual(false);
  });

  test("it should not render a selectable timeline table if timelineStatus is immutable (selecting Elastic templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.immutable,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="timelines-table"]').first().prop('actionTimelineToShow')
    ).toEqual(['createFrom', 'duplicate']);
  });

  test("it should not render selected count if timelineStatus is immutable (selecting Elastic templates' tab)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: TimelineStatus.immutable,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selected-count"]').exists()).toEqual(false);
  });

  test("it should render bulk actions if timelineStatus is null (no template timelines' tab selected)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="utility-bar-action"]').exists()).toEqual(true);
  });

  test("it should render a selectable timeline table if timelineStatus is null (no template timelines' tab selected)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(
      wrapper.find('[data-test-subj="timelines-table"]').first().prop('actionTimelineToShow')
    ).toEqual(['createFrom', 'duplicate', 'export', 'selectable', 'delete']);
  });

  test("it should render selected count if timelineStatus is null (no template timelines' tab selected)", () => {
    const defaultProps = {
      ...getDefaultTestProps(mockResults),
      timelineStatus: null,
    };
    const wrapper = mountWithIntl(
      <ThemeProvider theme={mockTheme}>
        <OpenTimeline {...defaultProps} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="selected-count"]').exists()).toEqual(true);
  });
});
