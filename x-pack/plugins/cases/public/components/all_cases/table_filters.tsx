/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isEqual } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiFilterGroup, EuiButton } from '@elastic/eui';

import type { CaseStatuses } from '../../../common/types/domain';
import { MAX_TAGS_FILTER_LENGTH, MAX_CATEGORY_FILTER_LENGTH } from '../../../common/constants';
import type { FilterOptions } from '../../containers/types';
import { MultiSelectFilter } from './multi_select_filter';
import { SolutionFilter } from './solution_filter';
import { StatusFilter } from './status_filter';
import * as i18n from './translations';
import { SeverityFilter } from './severity_filter';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import { AssigneesFilterPopover } from './assignees_filter';
import type { CurrentUserProfile } from '../types';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { AssigneesFilteringSelection } from '../user_profiles/types';
import type { Solution } from './types';

interface CasesTableFiltersProps {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  hiddenStatuses?: CaseStatuses[];
  availableSolutions: Solution[];
  isSelectorView?: boolean;
  onCreateCasePressed?: () => void;
  isLoading: boolean;
  currentUserProfile: CurrentUserProfile;
  filterOptions: FilterOptions;
}

const CasesTableFiltersComponent = ({
  countClosedCases,
  countOpenCases,
  countInProgressCases,
  onFilterChanged,
  hiddenStatuses,
  availableSolutions,
  isSelectorView = false,
  onCreateCasePressed,
  isLoading,
  currentUserProfile,
  filterOptions,
}: CasesTableFiltersProps) => {
  const [search, setSearch] = useState(filterOptions.search);
  const [selectedOwner, setSelectedOwner] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneesFilteringSelection[]>([]);
  const { data: tags = [] } = useGetTags();
  const { data: categories = [] } = useGetCategories();
  const { caseAssignmentAuthorized } = useCasesFeatures();

  const onChange = ({
    filterId,
    options,
  }: {
    filterId: keyof FilterOptions;
    options: string[];
  }) => {
    const newFilters = {
      ...filterOptions,
      [filterId]: options,
    };

    if (!isEqual(newFilters, filterOptions)) {
      onFilterChanged(newFilters);
    }
  };

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

  const handleSelectedSolution = useCallback(
    (newOwner) => {
      if (!isEqual(newOwner, selectedOwner)) {
        setSelectedOwner(newOwner);
        onFilterChanged({ owner: newOwner });
      }
    },
    [onFilterChanged, selectedOwner]
  );

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

  const handleOnCreateCasePressed = useCallback(() => {
    if (onCreateCasePressed) {
      onCreateCasePressed();
    }
  }, [onCreateCasePressed]);

  return (
    <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
      {isSelectorView && onCreateCasePressed ? (
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
      <EuiFlexItem grow={false}>
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
          <SeverityFilter selectedOptions={filterOptions.severity} onChange={onChange} />
          <StatusFilter
            selectedOptions={filterOptions?.status}
            onChange={onChange}
            hiddenStatuses={hiddenStatuses}
            countClosedCases={countClosedCases}
            countInProgressCases={countInProgressCases}
            countOpenCases={countOpenCases}
          />
          {caseAssignmentAuthorized && !isSelectorView ? (
            <AssigneesFilterPopover
              selectedAssignees={selectedAssignees}
              currentUserProfile={currentUserProfile}
              isLoading={isLoading}
              onSelectionChange={handleSelectedAssignees}
            />
          ) : null}
          <MultiSelectFilter
            buttonLabel={i18n.TAGS}
            id={'tags'}
            limit={MAX_TAGS_FILTER_LENGTH}
            limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_TAGS_FILTER_LENGTH, 'tags')}
            onChange={onChange}
            options={tags}
            selectedOptions={filterOptions?.tags}
          />
          <MultiSelectFilter
            buttonLabel={i18n.CATEGORIES}
            id={'category'}
            limit={MAX_CATEGORY_FILTER_LENGTH}
            limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_CATEGORY_FILTER_LENGTH, 'categories')}
            onChange={onChange}
            options={categories}
            selectedOptions={filterOptions?.category}
          />
          {availableSolutions.length > 1 && (
            <SolutionFilter
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
