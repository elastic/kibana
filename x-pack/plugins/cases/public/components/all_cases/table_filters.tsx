/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiButton } from '@elastic/eui';
import { mergeWith, isEqual } from 'lodash';
import { MoreFiltersSelectable } from './table_filter_config/more_filters_selectable';
import type { CaseStatuses } from '../../../common/types/domain';
import type { FilterOptions } from '../../containers/types';
import * as i18n from './translations';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import type { CurrentUserProfile } from '../types';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useSystemFilterConfig } from './table_filter_config/use_system_filter_config';
import { useFilterConfig } from './table_filter_config/use_filter_config';

export interface CasesTableFiltersProps {
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

const mergeCustomizer = (objValue: string | string[], srcValue: string | string[], key: string) => {
  if (Array.isArray(objValue)) {
    return srcValue;
  }
};

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
  const { data: tags = [] } = useGetTags();
  const { data: categories = [] } = useGetCategories();
  const { caseAssignmentAuthorized } = useCasesFeatures();

  const onFilterOptionsChange = useCallback(
    (partialFilterOptions: Partial<FilterOptions>) => {
      const newFilterOptions = mergeWith({}, filterOptions, partialFilterOptions, mergeCustomizer);
      if (!isEqual(newFilterOptions, filterOptions)) {
        onFilterChanged(newFilterOptions);
      }
    },
    [filterOptions, onFilterChanged]
  );

  const { systemFilterConfig } = useSystemFilterConfig({
    availableSolutions,
    caseAssignmentAuthorized,
    categories,
    countClosedCases,
    countInProgressCases,
    countOpenCases,
    currentUserProfile,
    hiddenStatuses,
    isLoading,
    isSelectorView,
    onFilterOptionsChange,
    tags,
  });

  const {
    filters: activeFilters,
    selectableOptions,
    activeSelectableOptionKeys,
    onFilterConfigChange,
  } = useFilterConfig({ systemFilterConfig, onFilterOptionsChange, isSelectorView, filterOptions });

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
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexStart"
      wrap={true}
      data-test-subj="cases-table-filters"
    >
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
      {activeFilters.map((filter) => (
        <EuiFlexItem grow={false} key={filter.key}>
          {filter.render({ filterOptions })}
        </EuiFlexItem>
      ))}

      {isSelectorView || (
        <EuiFlexItem grow={false}>
          <MoreFiltersSelectable
            options={selectableOptions}
            activeFilters={activeSelectableOptionKeys}
            onChange={onFilterConfigChange}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
