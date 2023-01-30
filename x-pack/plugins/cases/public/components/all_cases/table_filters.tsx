/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { isEqual } from 'lodash/fp';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiFilterGroup } from '@elastic/eui';

import type { CaseStatusWithAllStatus, CaseSeverityWithAll } from '../../../common/ui/types';
import { StatusAll } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';
import type { FilterOptions } from '../../containers/types';
import { FilterPopover } from '../filter_popover';
import { StatusFilter } from './status_filter';
import * as i18n from './translations';
import { SeverityFilter } from './severity_filter';
import { useGetTags } from '../../containers/use_get_tags';
import { DEFAULT_FILTER_OPTIONS } from '../../containers/use_get_cases';
import { AssigneesFilterPopover } from './assignees_filter';
import type { CurrentUserProfile } from '../types';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { AssigneesFilteringSelection } from '../user_profiles/types';

interface CasesTableFiltersProps {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  initial: FilterOptions;
  hiddenStatuses?: CaseStatusWithAllStatus[];
  availableSolutions: string[];
  isSelectorView?: boolean;
  isLoading: boolean;
  currentUserProfile: CurrentUserProfile;
}

// Fix the width of the status dropdown to prevent hiding long text items
const StatusFilterWrapper = styled(EuiFlexItem)`
  && {
    flex-basis: 180px;
  }
`;

const SeverityFilterWrapper = styled(EuiFlexItem)`
  && {
    flex-basis: 180px;
  }
`;

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  countInProgressCases,
  onFilterChanged,
  initial = DEFAULT_FILTER_OPTIONS,
  hiddenStatuses,
  availableSolutions,
  isSelectorView = false,
  isLoading,
  currentUserProfile,
}: CasesTableFiltersProps) => {
  const [search, setSearch] = useState(initial.search);
  const [selectedTags, setSelectedTags] = useState(initial.tags);
  const [selectedOwner, setSelectedOwner] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneesFilteringSelection[]>([]);
  const { data: tags = [] } = useGetTags();
  const { caseAssignmentAuthorized } = useCasesFeatures();

  const handleSelectedAssignees = useCallback(
    (newAssignees: AssigneesFilteringSelection[]) => {
      if (!isEqual(newAssignees, selectedAssignees)) {
        setSelectedAssignees(newAssignees);
        onFilterChanged({
          assignees: newAssignees.map((assignee) => assignee?.uid ?? null),
        });
      }
    },
    [selectedAssignees, onFilterChanged]
  );

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
      if (!isEqual(newOwner, selectedOwner)) {
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

  const onSeverityChanged = useCallback(
    (severity: CaseSeverityWithAll) => {
      onFilterChanged({ severity });
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
          <SeverityFilterWrapper grow={false} data-test-subj="severity-filter-wrapper">
            <SeverityFilter
              selectedSeverity={initial.severity}
              onSeverityChange={onSeverityChanged}
              isLoading={false}
              isDisabled={false}
            />
          </SeverityFilterWrapper>
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
          {caseAssignmentAuthorized && !isSelectorView ? (
            <AssigneesFilterPopover
              selectedAssignees={selectedAssignees}
              currentUserProfile={currentUserProfile}
              isLoading={isLoading}
              onSelectionChange={handleSelectedAssignees}
            />
          ) : null}
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
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
