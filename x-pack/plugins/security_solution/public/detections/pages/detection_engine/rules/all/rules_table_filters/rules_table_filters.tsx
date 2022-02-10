/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { isEqual } from 'lodash/fp';

import * as i18n from '../../translations';

import { FilterOptions } from '../../../../../containers/detection_engine/rules';
import { TagsFilterPopover } from './tags_filter_popover';

interface RulesTableFiltersProps {
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  currentFilterTags: string[];
  tags: string[];
  isLoadingTags: boolean;
  reFetchTags: () => void;
}

/**
 * Collection of filters for filtering data within the RulesTable. Contains search bar, Elastic/Custom
 * Rules filter button toggle, and tag selection
 *
 * @param onFilterChanged change listener to be notified on filter changes
 */
const RulesTableFiltersComponent = ({
  onFilterChanged,
  rulesCustomInstalled,
  rulesInstalled,
  currentFilterTags,
  tags,
  isLoadingTags,
  reFetchTags,
}: RulesTableFiltersProps) => {
  const [filter, setFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCustomRules, setShowCustomRules] = useState<boolean>(false);
  const [showElasticRules, setShowElasticRules] = useState<boolean>(false);

  useEffect(() => {
    reFetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesCustomInstalled, rulesInstalled]);

  // Propagate filter changes to parent
  useEffect(() => {
    onFilterChanged({ filter, showCustomRules, showElasticRules, tags: selectedTags });
  }, [filter, selectedTags, showCustomRules, showElasticRules, onFilterChanged]);

  const handleOnSearch = useCallback((filterString) => setFilter(filterString.trim()), [setFilter]);

  const handleElasticRulesClick = useCallback(() => {
    setShowElasticRules(!showElasticRules);
    setShowCustomRules(false);
  }, [setShowElasticRules, showElasticRules, setShowCustomRules]);

  const handleCustomRulesClick = useCallback(() => {
    setShowCustomRules(!showCustomRules);
    setShowElasticRules(false);
  }, [setShowElasticRules, showCustomRules, setShowCustomRules]);

  const handleSelectedTags = useCallback(
    (newTags) => {
      if (!isEqual(newTags, selectedTags)) {
        setSelectedTags(newTags);
      }
    },
    [selectedTags]
  );

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
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
            isLoading={isLoadingTags}
            onSelectedTagsChanged={handleSelectedTags}
            selectedTags={selectedTags}
            tags={tags}
            currentFilterTags={currentFilterTags}
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
            <>
              {i18n.CUSTOM_RULES}
              {rulesCustomInstalled != null ? ` (${rulesCustomInstalled})` : ''}
            </>
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

RulesTableFiltersComponent.displayName = 'RulesTableFiltersComponent';

export const RulesTableFilters = React.memo(RulesTableFiltersComponent);

RulesTableFilters.displayName = 'RulesTableFilters';
