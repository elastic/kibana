/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { useTags } from '../../../../../containers/detection_engine/rules/use_tags';
import { TagsFilterPopover } from './tags_filter_popover';

interface RulesTableFiltersProps {
  onFilterChanged: (filterOptions: Partial<FilterOptions>) => void;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
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
}: RulesTableFiltersProps) => {
  const [filter, setFilter] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCustomRules, setShowCustomRules] = useState<boolean>(false);
  const [showElasticRules, setShowElasticRules] = useState<boolean>(false);
  const [isLoadingTags, tags, reFetchTags] = useTags();

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
      <EuiFlexItem grow={true}>
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
          />
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <EuiFilterButton
            hasActiveFilters={showElasticRules}
            onClick={handleElasticRulesClick}
            data-test-subj="show-elastic-rules-filter-button"
            withNext
          >
            {i18n.ELASTIC_RULES}
            {rulesInstalled != null ? ` (${rulesInstalled})` : ''}
          </EuiFilterButton>
          <EuiFilterButton
            hasActiveFilters={showCustomRules}
            onClick={handleCustomRulesClick}
            data-test-subj="show-custom-rules-filter-button"
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
