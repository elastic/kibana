/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { isEqual } from 'lodash/fp';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiFilterGroup, EuiButton } from '@elastic/eui';

import { StatusAll, CaseStatusWithAllStatus } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
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
  hiddenStatuses?: CaseStatusWithAllStatus[];
  availableSolutions: string[];
  displayCreateCaseButton?: boolean;
  onCreateCasePressed?: () => void;
}

// Fix the width of the status dropdown to prevent hiding long text items
const StatusFilterWrapper = styled(EuiFlexItem)`
  && {
    flex-basis: 180px;
  }
`;

/**
 * Collection of filters for filtering data within the CasesTable. Contains search bar,
 * and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */

const defaultInitial = {
  search: '',
  reporters: [],
  status: StatusAll,
  tags: [],
  owner: [],
};

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  countInProgressCases,
  onFilterChanged,
  initial = defaultInitial,
  setFilterRefetch,
  hiddenStatuses,
  availableSolutions,
  displayCreateCaseButton,
  onCreateCasePressed,
}: CasesTableFiltersProps) => {
  const [selectedReporters, setSelectedReporters] = useState(
    initial.reporters.map((r) => r.full_name ?? r.username ?? '')
  );
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [selectedOwner, setSelectedOwner] = useState(initial.owner);
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
    [selectedReporters, respReporters, onFilterChanged]
  );

  useEffect(() => {
    if (selectedReporters.length) {
      const newReporters = selectedReporters.filter((r) => reporters.includes(r));
      handleSelectedReporters(newReporters);
    }
  }, [handleSelectedReporters, reporters, selectedReporters]);

  const handleSelectedTags = useCallback(
    (newTags) => {
      if (!isEqual(newTags, selectedTags)) {
        setSelectedTags(newTags);
        onFilterChanged({ tags: newTags });
      }
    },
    [onFilterChanged, selectedTags]
  );

  const handleSelectedSolution = useCallback(
    (newOwner) => {
      if (!isEqual(newOwner, selectedOwner) && newOwner.length) {
        setSelectedOwner(newOwner);
        onFilterChanged({ owner: newOwner });
      }
    },
    [onFilterChanged, selectedOwner]
  );

  useEffect(() => {
    if (selectedTags.length) {
      const newTags = selectedTags.filter((t) => tags.includes(t));
      handleSelectedTags(newTags);
    }
  }, [handleSelectedTags, selectedTags, tags]);

  const handleOnSearch = useCallback(
    (newSearch) => {
      const trimSearch = newSearch.trim();
      if (!isEqual(trimSearch, search)) {
        setSearch(trimSearch);
        onFilterChanged({ search: trimSearch });
      }
    },
    [onFilterChanged, search]
  );

  const onStatusChanged = useCallback(
    (status: CaseStatusWithAllStatus) => {
      onFilterChanged({ status });
    },
    [onFilterChanged]
  );

  const stats = useMemo(
    () => ({
      [StatusAll]: null,
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );

  const handleOnCreateCasePressed = useCallback(() => {
    if (onCreateCasePressed) {
      onCreateCasePressed();
    }
  }, [onCreateCasePressed]);

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFieldSearch
              aria-label={i18n.SEARCH_CASES}
              data-test-subj="search-cases"
              fullWidth
              incremental={false}
              placeholder={i18n.SEARCH_PLACEHOLDER}
              onSearch={handleOnSearch}
            />
          </EuiFlexItem>
          <StatusFilterWrapper grow={false} data-test-subj="status-filter-wrapper">
            <StatusFilter
              selectedStatus={initial.status}
              onStatusChanged={onStatusChanged}
              stats={stats}
              hiddenStatuses={hiddenStatuses}
            />
          </StatusFilterWrapper>
        </EuiFlexGroup>
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
          {availableSolutions.length > 1 && (
            <FilterPopover
              buttonLabel={i18n.SOLUTION}
              onSelectedOptionsChanged={handleSelectedSolution}
              selectedOptions={selectedOwner}
              options={availableSolutions}
            />
          )}
        </EuiFilterGroup>
      </EuiFlexItem>
      {displayCreateCaseButton && onCreateCasePressed ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleOnCreateCasePressed}
            iconType="plusInCircle"
            data-test-subj="cases-table-add-case-filter-bar"
          >
            {i18n.CREATE_CASE_TITLE}
          </EuiButton>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
