/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import * as React from 'react';

import { DEFAULT_SEARCH_RESULTS_PER_PAGE } from '../../../pages/timelines/timelines_page';
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '..';
import { getEmptyValue } from '../../empty_value';
import { mockTimelineResults } from '../../../mock/timeline_results';
import { TimelineResult } from '../types';

import { TimelinesTable } from '.';

import * as i18n from '../translations';

describe('#getExtendedColumns', () => {
  let mockResults: TimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  describe('Modified By column', () => {
    test('it renders the expected column name', () => {
      const wrapper = mountWithIntl(
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      );

      expect(
        wrapper
          .find('thead tr th')
          .at(5)
          .text()
      ).toContain(i18n.MODIFIED_BY);
    });

    test('it renders the username when the timeline has an updatedBy property', () => {
      const wrapper = mountWithIntl(
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={mockResults}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={mockResults.length}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="username"]')
          .first()
          .text()
      ).toEqual(mockResults[0].updatedBy);
    });

    test('it renders a placeholder when the timeline is missing the updatedBy property', () => {
      const missingUpdatedBy: TimelineResult[] = [omit('updatedBy', { ...mockResults[0] })];

      const wrapper = mountWithIntl(
        <TimelinesTable
          deleteTimelines={jest.fn()}
          defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          loading={false}
          itemIdToExpandedNotesRowMap={{}}
          onOpenTimeline={jest.fn()}
          onSelectionChange={jest.fn()}
          onTableChange={jest.fn()}
          onToggleShowNotes={jest.fn()}
          pageIndex={0}
          pageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
          searchResults={missingUpdatedBy}
          showExtendedColumnsAndActions={true}
          sortDirection={DEFAULT_SORT_DIRECTION}
          sortField={DEFAULT_SORT_FIELD}
          totalSearchResultsCount={missingUpdatedBy.length}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="username"]')
          .first()
          .text()
      ).toEqual(getEmptyValue());
    });
  });
});
