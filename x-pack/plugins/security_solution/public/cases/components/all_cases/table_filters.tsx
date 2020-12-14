/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { isEqual } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiFilterGroup } from '@elastic/eui';

import { CaseStatuses } from '../../../../../case/common/api';
import { FilterOptions } from '../../containers/types';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetReporters } from '../../containers/use_get_reporters';
import { FilterPopover } from '../filter_popover';
import { StatusFilter } from './status_filter';

import * as i18n from './translations';
interface CasesTableFiltersProps {
  countClosedCases: number | null;
  countInProgressCases: number | null;
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

const defaultInitial = { search: '', reporters: [], status: CaseStatuses.open, tags: [] };

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  countInProgressCases,
  onFilterChanged,
  initial = defaultInitial,
  setFilterRefetch,
}: CasesTableFiltersProps) => {
  const [selectedReporters, setSelectedReporters] = useState(
    initial.reporters.map((r) => r.full_name ?? r.username ?? '')
  );
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
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

  const onStatusChanged = useCallback(
    (status: CaseStatuses) => {
      onFilterChanged({ status });
    },
    [onFilterChanged]
  );

  const stats = useMemo(
    () => ({
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={8}>
        <EuiFieldSearch
          aria-label={i18n.SEARCH_CASES}
          data-test-subj="search-cases"
          fullWidth
          incremental={false}
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={handleOnSearch}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={2}>
        <StatusFilter
          selectedStatus={initial.status}
          onStatusChanged={onStatusChanged}
          stats={stats}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
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
