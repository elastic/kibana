/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { EuiFilterButton, EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { RULES_TABLE_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
// import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { TagsFilter } from '../../tags_filter/tags_filter';
import { RuleSearchField } from './rule_search_field';
import { TypeStatusFilterPopover } from '../../type_status_filter/type_status_filter';
import type { FilterOptions } from '../../../../rule_management/logic';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

export interface RulesTableFiltersProps {
  filterOptions: FilterOptions;
  setFilterOptions: (newFilter: Partial<FilterOptions>) => void;
  showRuleTypeStatusFilter?: boolean;
}

/**
 * Collection of filters for filtering data within the RulesTable. Contains search bar, Elastic/Custom
 * Rules filter button toggle, and tag selection
 */
export const RulesTableFilters = React.memo<RulesTableFiltersProps>(
  ({ filterOptions, setFilterOptions, showRuleTypeStatusFilter = true }) => {
    const { startTransaction } = useStartTransaction();

    // @ts-ignore-next-line
    const { showCustomRules, showElasticRules, tags, enabled } = filterOptions;
    const selectedTags: EuiSelectableOption[] = tags.map((t) => ({ label: t, checked: 'on' }));

    const handleOnSearch = useCallback(
      (filterString) => {
        startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
        setFilterOptions({ filter: filterString.trim() });
      },
      [setFilterOptions, startTransaction]
    );

    // const handleElasticRulesClick = useCallback(() => {
    //   startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    //   setFilterOptions({ showElasticRules: !showElasticRules, showCustomRules: false });
    // }, [setFilterOptions, showElasticRules, startTransaction]);
    //
    // const handleCustomRulesClick = useCallback(() => {
    //   startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    //   setFilterOptions({ showCustomRules: !showCustomRules, showElasticRules: false });
    // }, [setFilterOptions, showCustomRules, startTransaction]);
    //
    // const handleShowEnabledRulesClick = useCallback(() => {
    //   startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    //   setFilterOptions(enabled === true ? { enabled: undefined } : { enabled: true });
    // }, [setFilterOptions, enabled, startTransaction]);
    //
    // const handleShowDisabledRulesClick = useCallback(() => {
    //   startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
    //   setFilterOptions(enabled === false ? { enabled: undefined } : { enabled: false });
    // }, [setFilterOptions, enabled, startTransaction]);

    const handleSelectedTags = useCallback(
      (newTags: string[]) => {
        if (!isEqual(newTags, selectedTags)) {
          startTransaction({ name: RULES_TABLE_ACTIONS.FILTER });
          setFilterOptions({ tags: newTags });
        }
      },
      [selectedTags, setFilterOptions, startTransaction]
    );

    return (
      <FilterWrapper gutterSize="m" justifyContent="flexEnd" wrap>
        {showRuleTypeStatusFilter && (
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <TypeStatusFilterPopover
                onSelectedTagsChanged={handleSelectedTags}
                selectedTags={[]}
                tags={[]}
                data-test-subj="allRulesTagPopover"
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <TagsFilter
              onSelectedTagsChanged={handleSelectedTags}
              selectedTags={selectedTags}
              tags={tags}
              data-test-subj="allRulesTagPopover"
            />
          </EuiFilterGroup>
        </EuiFlexItem>
        <RuleSearchField initialValue={filterOptions.filter} onSearch={handleOnSearch} />
      </FilterWrapper>
    );
  }
);

RulesTableFilters.displayName = 'RulesTableFilters';
