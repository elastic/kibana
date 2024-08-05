/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../../pages/timelines_page';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '../constants';
import type { OpenTimelineResult } from '../types';
import type { TimelinesTableProps } from '.';
import { TimelineType } from '../../../../../common/api/timeline';

export const getMockTimelinesTableProps = (
  mockOpenTimelineResults: OpenTimelineResult[]
): TimelinesTableProps => ({
  actionTimelineToShow: ['delete', 'duplicate', 'selectable'],
  deleteTimelines: jest.fn(),
  defaultPageSize: DEFAULT_SEARCH_RESULTS_PER_PAGE,
  enableExportTimelineDownloader: jest.fn(),
  itemIdToExpandedNotesRowMap: {},
  loading: false,
  onOpenDeleteTimelineModal: jest.fn(),
  onOpenTimeline: jest.fn(),
  onSelectionChange: jest.fn(),
  onTableChange: jest.fn(),
  onToggleShowNotes: jest.fn(),
  pageIndex: 0,
  pageSize: DEFAULT_SEARCH_RESULTS_PER_PAGE,
  searchResults: mockOpenTimelineResults,
  showExtendedColumns: true,
  sortDirection: DEFAULT_SORT_DIRECTION,
  sortField: DEFAULT_SORT_FIELD,
  timelineType: TimelineType.default,
  totalSearchResultsCount: mockOpenTimelineResults.length,
  tableRef: { current: null },
});
