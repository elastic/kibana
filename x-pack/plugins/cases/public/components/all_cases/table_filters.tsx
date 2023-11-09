/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isEqual, difference } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiFilterGroup, EuiButton } from '@elastic/eui';

import { builderMap as customFieldsBuilder } from '../custom_fields/builder';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
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

const getSystemFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  isSelectorView,
}: {
  availableSolutions: string[];
  caseAssignmentAuthorized: boolean;
  isSelectorView: boolean;
}) => {
  return [
    {
      key: 'severity',
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange }) => (
        <SeverityFilter selectedOptions={filterOptions.severity} onChange={onChange} />
      ),
    },
    {
      key: 'status',
      isActive: true,
      isAvailable: true,
      render: ({
        filterOptions,
        onChange,
        hiddenStatuses,
        countClosedCases,
        countInProgressCases,
        countOpenCases,
      }) => (
        <StatusFilter
          selectedOptions={filterOptions?.status}
          onChange={onChange}
          hiddenStatuses={hiddenStatuses}
          countClosedCases={countClosedCases}
          countInProgressCases={countInProgressCases}
          countOpenCases={countOpenCases}
        />
      ),
    },
    // {
    //   key: 'assignee',
    //   isActive: true,
    //   isAvailable: caseAssignmentAuthorized && !isSelectorView,
    //   render: ({ filterOptions, onChange }) => (
    //     <AssigneesFilterPopover
    //       selectedAssignees={selectedAssignees}
    //       currentUserProfile={currentUserProfile}
    //       isLoading={isLoading}
    //       onSelectionChange={handleSelectedAssignees}
    //     />
    //   ),
    // },
    {
      key: 'tags',
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange, tags }) => (
        <MultiSelectFilter
          buttonLabel={i18n.TAGS}
          id={'tags'}
          limit={MAX_TAGS_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_TAGS_FILTER_LENGTH, 'tags')}
          onChange={onChange}
          options={tags}
          selectedOptions={filterOptions?.tags}
        />
      ),
    },
    {
      key: 'category',
      isActive: true,
      isAvailable: true,
      render: ({ filterOptions, onChange, categories }) => (
        <MultiSelectFilter
          buttonLabel={i18n.CATEGORIES}
          id={'category'}
          limit={MAX_CATEGORY_FILTER_LENGTH}
          limitReachedMessage={i18n.MAX_SELECTED_FILTER(MAX_CATEGORY_FILTER_LENGTH, 'categories')}
          onChange={onChange}
          options={categories}
          selectedOptions={filterOptions?.category}
        />
      ),
    },
    {
      key: 'owner',
      isActive: true,
      isAvailable: availableSolutions.length > 1,
      render: ({ filterOptions, onChange }) => (
        <SolutionFilter
          onChange={onChange}
          selectedOptions={filterOptions?.owner}
          availableSolutions={availableSolutions}
        />
      ),
    },
  ].filter((filter) => filter.isAvailable);
};

const useCustomFieldsFilterConfig = () => {
  const {
    data: { customFields },
  } = useGetCaseConfiguration();

  const customFieldsFilterConfig = [];
  for (const { type, label } of customFields ?? []) {
    if (customFieldsBuilder[type]) {
      customFieldsFilterConfig.push({
        key: label,
        isActive: false,
        render: () => <div>TODO</div>,
      });
    }
  }

  return { customFieldsFilterConfig };
};

const useFilterConfig = ({
  availableSolutions,
  caseAssignmentAuthorized,
  isSelectorView,
}: {
  availableSolutions: string[];
  caseAssignmentAuthorized: boolean;
  isSelectorView: boolean;
}) => {
  const { customFieldsFilterConfig } = useCustomFieldsFilterConfig();
  const [config, setConfig] = useState(() => [
    ...getSystemFilterConfig({
      availableSolutions,
      caseAssignmentAuthorized,
      isSelectorView,
    }),
    ...customFieldsFilterConfig,
  ]);

  const filterConfigOptions = config.map((filter) => filter.key);
  const selectedFilterConfigOptions = config
    .filter((filter) => filter.isActive)
    .filter(Boolean)
    .map((filter) => filter.key);

  const onFilterConfigChange = ({ filterId, options }: { filterId: string; options: string[] }) => {
    const addedOption = difference(options, selectedFilterConfigOptions)[0];
    const removedOption = difference(selectedFilterConfigOptions, options)[0];

    let newConfig;
    if (addedOption) {
      const addedFilter = config.find((filter) => filter.key === addedOption);
      newConfig = config.filter((filter) => filter.key !== addedOption);
      newConfig.push({
        ...addedFilter,
        isActive: true,
      });
    } else if (removedOption) {
      newConfig = config.map((filter) => {
        if (filter.key === removedOption) {
          return {
            ...filter,
            isActive: false,
          };
        }
        return filter;
      });
    }
    setConfig(newConfig);
  };

  return {
    config,
    filterConfigOptions: filterConfigOptions.sort(),
    onFilterConfigChange,
    selectedFilterConfigOptions,
  };
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
  const [selectedAssignees, setSelectedAssignees] = useState<AssigneesFilteringSelection[]>([]);
  const { data: tags = [] } = useGetTags();
  const { data: categories = [] } = useGetCategories();
  const { caseAssignmentAuthorized } = useCasesFeatures();

  const {
    config: filterConfig,
    filterConfigOptions,
    onFilterConfigChange,
    selectedFilterConfigOptions,
  } = useFilterConfig({
    availableSolutions,
    caseAssignmentAuthorized,
    isSelectorView,
  });

  const onFilterOptionChange = ({
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
          {filterConfig
            .filter((filter) => filter.isActive)
            .map((filter) =>
              filter.render({
                onChange: onFilterOptionChange,
                filterOptions,
                hiddenStatuses,
                countClosedCases,
                countInProgressCases,
                countOpenCases,
                tags,
                categories,
              })
            )}
          <MultiSelectFilter
            id="custom-fields" // FIXME: wth?
            buttonLabel={'MORE +'} // FIXME: Translation and + icon
            options={filterConfigOptions} // FIXME: Load custom fields, merge with default ones (status, severity, etc.)
            selectedOptions={selectedFilterConfigOptions} // FIXME: Think about how this should work
            // limit={10} // FIXME: We should set a limit
            onChange={onFilterConfigChange} // FIXME: This should save in local storage
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

CasesTableFiltersComponent.displayName = 'CasesTableFiltersComponent';

export const CasesTableFilters = React.memo(CasesTableFiltersComponent);

CasesTableFilters.displayName = 'CasesTableFilters';
