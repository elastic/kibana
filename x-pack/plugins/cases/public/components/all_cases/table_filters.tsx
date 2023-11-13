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
import type { FilterOptions } from '../../containers/types';
import * as i18n from './translations';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import type { CurrentUserProfile } from '../types';
import { useCasesFeatures } from '../../common/use_cases_features';
import type { AssigneesFilteringSelection } from '../user_profiles/types';
import { useSystemFilterConfig } from './use_system_filter_config';
import { useFilterConfig } from './use_filter_config';

interface CasesTableFiltersProps {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  hiddenStatuses?: CaseStatuses[];
  availableSolutions: string[];
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
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneesFilteringSelection[]>([]);
  const { data: tags = [] } = useGetTags();
  const { data: categories = [] } = useGetCategories();
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

  const { systemFilterConfig } = useSystemFilterConfig({
    availableSolutions,
    caseAssignmentAuthorized,
    categories,
    countClosedCases,
    countInProgressCases,
    countOpenCases,
    currentUserProfile,
    handleSelectedAssignees,
    hiddenStatuses,
    isLoading,
    isSelectorView,
    selectedAssignees,
    tags,
  });

  const {
    config: filterConfig,
    moreFiltersSelectableComponent: MoreFiltersSelectable,
    filterConfigOptions,
    activeFilters,
    onFilterConfigChange,
  } = useFilterConfig({ systemFilterConfig });

  const onFilterOptionChange = ({ filterId, options }: { filterId: string; options: string[] }) => {
    const newFilters = {
      ...filterOptions,
      [filterId]: options,
    };

    if (!isEqual(newFilters, filterOptions)) {
      onFilterChanged(newFilters);
    }
  };

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
          {filterConfig.map((filter) =>
            filter.render({ filterOptions, onChange: onFilterOptionChange })
          )}
          <MoreFiltersSelectable
            options={filterConfigOptions}
            activeFilters={activeFilters}
            onChange={onFilterConfigChange}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
