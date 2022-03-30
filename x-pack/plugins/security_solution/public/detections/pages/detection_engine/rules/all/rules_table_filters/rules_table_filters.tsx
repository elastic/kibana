/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import * as i18n from '../../translations';
import { useRulesTableContext } from '../rules_table/rules_table_context';
import { TagsFilterPopover } from './tags_filter_popover';

const FilterWrapper = styled(EuiFlexGroup)`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface RulesTableFiltersProps {
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  allTags: string[];
}

/**
 * Collection of filters for filtering data within the RulesTable. Contains search bar, Elastic/Custom
 * Rules filter button toggle, and tag selection
 */
const RulesTableFiltersComponent = ({
  rulesCustomInstalled,
  rulesInstalled,
  allTags,
}: RulesTableFiltersProps) => {
  const {
    state: { filterOptions },
    actions: { setFilterOptions },
  } = useRulesTableContext();

  const { showCustomRules, showElasticRules, tags: selectedTags } = filterOptions;

  const handleOnSearch = useCallback(
    (filterString) => setFilterOptions({ filter: filterString.trim() }),
    [setFilterOptions]
  );

  const handleElasticRulesClick = useCallback(() => {
    setFilterOptions({ showElasticRules: !showElasticRules, showCustomRules: false });
  }, [setFilterOptions, showElasticRules]);

  const handleCustomRulesClick = useCallback(() => {
    setFilterOptions({ showCustomRules: !showCustomRules, showElasticRules: false });
  }, [setFilterOptions, showCustomRules]);

  const handleSelectedTags = useCallback(
    (newTags: string[]) => {
      if (!isEqual(newTags, selectedTags)) {
        setFilterOptions({ tags: newTags });
      }
    },
    [selectedTags, setFilterOptions]
  );

  return (
    <FilterWrapper gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow>
        <EuiFieldSearch
          aria-label={i18n.SEARCH_RULES}
          fullWidth
          incremental={false}
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={handleOnSearch}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <TagsFilterPopover
            onSelectedTagsChanged={handleSelectedTags}
            selectedTags={selectedTags}
            tags={allTags}
            data-test-subj="allRulesTagPopover"
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={showElasticRules}
            onClick={handleElasticRulesClick}
            data-test-subj="showElasticRulesFilterButton"
            withNext
          >
            {i18n.ELASTIC_RULES}
            {rulesInstalled != null ? ` (${rulesInstalled})` : ''}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={showCustomRules}
            onClick={handleCustomRulesClick}
            data-test-subj="showCustomRulesFilterButton"
          >
            {i18n.CUSTOM_RULES}
            {rulesCustomInstalled != null ? ` (${rulesCustomInstalled})` : ''}
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </FilterWrapper>
  );
};

RulesTableFiltersComponent.displayName = 'RulesTableFiltersComponent';

export const RulesTableFilters = React.memo(RulesTableFiltersComponent);

RulesTableFilters.displayName = 'RulesTableFilters';
