/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DryRunResult } from '../use_bulk_actions_dry_run';
import type { FilterOptions } from '../../../../../../containers/detection_engine/rules/types';

import { convertRulesFilterToKQL } from '../../../../../../containers/detection_engine/rules/utils';
import { BULK_ACTIONS_DRY_RUN_ERR_CODE } from '../../../../../../../../common/constants';

interface PrepareSearchFilterProps {
  dryRunResult?: DryRunResult;
  isAllSelected: boolean;
  selectedRuleIds: string[];
  filterOptions: FilterOptions;
}

/**
 * helper methods to prepare search params for bulk actions based on results of previous dry run
 * It excludes failed rules from search and perform bulk action on possible successfully edited rules
 * @param dryRunResult {@link DryRunResult} result of API _bulk_action dry_run
 * @param {boolean} isAllSelected - is all rules selected or only on a page
 * @param {string[]} selectedRuleIds - list of selected rule ids
 * @param filterOptions {@link FilterOptions} find filter
 * @returns either list of ids or KQL search query (if isAllSelected === true)
 */
export const prepareSearchParams = ({
  isAllSelected,
  dryRunResult,
  selectedRuleIds,
  filterOptions,
}: PrepareSearchFilterProps) => {
  // if not all rules selected, filter out rules that failed during dry run
  if (!isAllSelected) {
    const failedRuleIdsSet = new Set(dryRunResult?.ruleErrors.flatMap(({ ruleIds }) => ruleIds));

    return { ids: selectedRuleIds.filter((id) => !failedRuleIdsSet.has(id)) };
  }

  // otherwise create filter that excludes failed results based on dry run errors
  let modifiedFilterOptions = filterOptions;
  dryRunResult?.ruleErrors.forEach(({ errorCode }) => {
    switch (errorCode) {
      case BULK_ACTIONS_DRY_RUN_ERR_CODE.IMMUTABLE:
        modifiedFilterOptions = { ...modifiedFilterOptions, showCustomRules: true };
        break;
      case BULK_ACTIONS_DRY_RUN_ERR_CODE.MACHINE_LEARNING_INDEX_PATTERN:
      case BULK_ACTIONS_DRY_RUN_ERR_CODE.MACHINE_LEARNING_AUTH:
        modifiedFilterOptions = {
          ...modifiedFilterOptions,
          excludeRuleTypes: [...(modifiedFilterOptions.excludeRuleTypes ?? []), 'machine_learning'],
        };
        break;
    }
  });

  return { query: convertRulesFilterToKQL(modifiedFilterOptions) };
};
