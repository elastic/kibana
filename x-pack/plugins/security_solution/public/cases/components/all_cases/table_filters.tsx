/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { isEqual } from 'lodash/fp';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import * as i18n from './translations';

import { FilterOptions } from '../../containers/types';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { FilterPopover } from '../filter_popover';

interface CasesTableFiltersProps {
  countClosedCases: number | null;
  countOpenCases: number | null;
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  initial: FilterOptions;
  setFilterRefetch: (val: () => void) => void;
}

/**
 * Collection of filters for filtering data within the CasesTable. Contains search bar,
 * and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */

const defaultInitial = { search: '', reporters: [], status: 'open', tags: [] };

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  onFilterChanged,
  initial = defaultInitial,
  setFilterRefetch,
}: CasesTableFiltersProps) => {
  const [selectedReporters, setSelectedReporters] = useState(
    initial.reporters.map((r) => r.full_name ?? r.username ?? '')
  );
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [showOpenCases, setShowOpenCases] = useState(initial.status === 'open');
  const { tags, fetchTags } = useGetTags();
  const { reporters, respReporters, fetchReporters } = useGetReporters();
  const refetch = useCallback(() => {
    fetchTags();
    fetchReporters();
  }, [fetchReporters, fetchTags]);
  useEffect(() => {
    if (setFilterRefetch != null) {
      setFilterRefetch(refetch);
    }
  }, [refetch, setFilterRefetch]);
  useEffect(() => {
    if (selectedReporters.length) {
      const newReporters = selectedReporters.filter((r) => reporters.includes(r));
      handleSelectedReporters(newReporters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporters]);
  useEffect(() => {
    if (selectedTags.length) {
      const newTags = selectedTags.filter((t) => tags.includes(t));
      handleSelectedTags(newTags);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  const handleSelectedReporters = useCallback(
    (newReporters) => {
      if (!isEqual(newReporters, selectedReporters)) {
        setSelectedReporters(newReporters);
        const reportersObj = respReporters.filter(
          (r) => newReporters.includes(r.username) || newReporters.includes(r.full_name)
        );
        onFilterChanged({ reporters: reportersObj });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedReporters, respReporters]
  );

  const handleSelectedTags = useCallback(
    (newTags) => {
      if (!isEqual(newTags, selectedTags)) {
        setSelectedTags(newTags);
        onFilterChanged({ tags: newTags });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTags]
  );
  const handleOnSearch = useCallback(
    (newSearch) => {
      const trimSearch = newSearch.trim();
      if (!isEqual(trimSearch, search)) {
        setSearch(trimSearch);
        onFilterChanged({ search: trimSearch });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search]
  );
  const handleToggleFilter = useCallback(
    (showOpen) => {
      if (showOpen !== showOpenCases) {
        setShowOpenCases(showOpen);
        onFilterChanged({ status: showOpen ? 'open' : 'closed' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showOpenCases]
  );
  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          aria-label={i18n.SEARCH_CASES}
          data-test-subj="search-cases"
          fullWidth
          incremental={false}
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={handleOnSearch}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            data-test-subj="open-case-count"
            withNext
            hasActiveFilters={showOpenCases}
            onClick={handleToggleFilter.bind(null, true)}
          >
            {i18n.OPEN_CASES}
            {countOpenCases != null ? ` (${countOpenCases})` : ''}
          </EuiFilterButton>
          <EuiFilterButton
            data-test-subj="closed-case-count"
            hasActiveFilters={!showOpenCases}
            onClick={handleToggleFilter.bind(null, false)}
          >
            {i18n.CLOSED_CASES}
            {countClosedCases != null ? ` (${countClosedCases})` : ''}
          </EuiFilterButton>
          <FilterPopover
            buttonLabel={i18n.REPORTER}
            onSelectedOptionsChanged={handleSelectedReporters}
            selectedOptions={selectedReporters}
            options={reporters}
            optionsEmptyLabel={i18n.NO_REPORTERS_AVAILABLE}
          />
          <FilterPopover
            buttonLabel={i18n.TAGS}
            onSelectedOptionsChanged={handleSelectedTags}
            selectedOptions={selectedTags}
            options={tags}
            optionsEmptyLabel={i18n.NO_TAGS_AVAILABLE}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
