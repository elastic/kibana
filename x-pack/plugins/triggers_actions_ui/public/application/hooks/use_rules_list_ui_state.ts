/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { RulesListFilters } from '../../types';

interface UseUiProps {
  authorizedToCreateAnyRules: boolean;
  filters: RulesListFilters;
  hasDefaultRuleTypesFiltersOn: boolean;
  isLoadingRuleTypes: boolean;
  isLoadingRules: boolean;
  hasData: boolean;
  isInitialLoadingRuleTypes: boolean;
  isInitialLoadingRules: boolean;
}

interface GetFilterAppliedProps {
  hasEmptyTypesFilter: boolean;
  filters: RulesListFilters;
}

const getFilterApplied = ({ hasEmptyTypesFilter, filters }: GetFilterAppliedProps) => {
  return !(
    hasEmptyTypesFilter &&
    isEmpty(filters.searchText) &&
    isEmpty(filters.actionTypes) &&
    isEmpty(filters.ruleExecutionStatuses) &&
    isEmpty(filters.ruleLastRunOutcomes) &&
    isEmpty(filters.ruleStatuses) &&
    isEmpty(filters.tags)
  );
};

export const useRulesListUiState = ({
  authorizedToCreateAnyRules,
  filters,
  hasDefaultRuleTypesFiltersOn,
  isLoadingRuleTypes,
  isLoadingRules,
  isInitialLoadingRuleTypes,
  isInitialLoadingRules,
  hasData,
}: UseUiProps) => {
  const hasEmptyTypesFilter = hasDefaultRuleTypesFiltersOn ? true : isEmpty(filters.types);
  const isFilterApplied = getFilterApplied({ hasEmptyTypesFilter, filters });
  const isInitialLoading = isInitialLoadingRuleTypes || isInitialLoadingRules;
  const isLoading = isLoadingRuleTypes || isLoadingRules;

  const showNoAuthPrompt = !isInitialLoadingRuleTypes && !authorizedToCreateAnyRules;
  const showCreateFirstRulePrompt = !isLoading && !hasData && !isFilterApplied;
  const showCreateFirstRulePromptWithoutCreateButton =
    showCreateFirstRulePrompt && authorizedToCreateAnyRules;
  const showSpinner =
    isInitialLoading && (isLoadingRuleTypes || (!showNoAuthPrompt && isLoadingRules));
  const showRulesList = !showSpinner && !showCreateFirstRulePrompt && !showNoAuthPrompt;
  const showHeaderWithCreateButton = showRulesList && authorizedToCreateAnyRules;
  const showHeaderWithoutCreateButton = showRulesList && !authorizedToCreateAnyRules;

  return {
    showSpinner,
    showRulesList,
    showNoAuthPrompt,
    showCreateFirstRulePrompt,
    showCreateFirstRulePromptWithoutCreateButton,
    showHeaderWithoutCreateButton,
    showHeaderWithCreateButton,
  };
};
