/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import * as i18n from './translations';
import { TagsFilterPopover } from '../rules_table_filters/tags_filter_popover';
import { RuleSearchField } from '../rules_table_filters/rule_search_field';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeM};
`;

/**
 * Collection of filters for filtering data within the Upgrade Prebuilt Rules table.
 * Contains search bar and tag selection
 */
const UpgradePrebuiltRulesTableFiltersComponent = () => {
  const {
    state: { filterOptions, tags },
    actions: { setFilterOptions },
  } = useUpgradePrebuiltRulesTableContext();

  const { tags: selectedTags } = filterOptions;

  const handleOnSearch = useCallback(
    (filterString: string) => {
      setFilterOptions((filters) => ({
        ...filters,
        filter: filterString.trim(),
      }));
    },
    [setFilterOptions]
  );

  const handleSelectedTags = useCallback(
    (newTags: string[]) => {
      if (!isEqual(newTags, selectedTags)) {
        setFilterOptions((filters) => ({
          ...filters,
          tags: newTags,
        }));
      }
    },
    [selectedTags, setFilterOptions]
  );

  return (
    <FilterWrapper gutterSize="m" justifyContent="flexEnd" wrap>
      <RuleSearchField
        initialValue={filterOptions.filter}
        onSearch={handleOnSearch}
        placeholder={i18n.SEARCH_PLACEHOLDER}
      />
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <TagsFilterPopover
            onSelectedTagsChanged={handleSelectedTags}
            selectedTags={selectedTags}
            tags={tags}
            data-test-subj="upgradeRulesTagPopover"
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </FilterWrapper>
  );
};

UpgradePrebuiltRulesTableFiltersComponent.displayName = 'UpgradePrebuiltRulesTableFiltersComponent';

export const UpgradePrebuiltRulesTableFilters = React.memo(
  UpgradePrebuiltRulesTableFiltersComponent
);

UpgradePrebuiltRulesTableFilters.displayName = 'UpgradePrebuiltRulesTableFilters';
