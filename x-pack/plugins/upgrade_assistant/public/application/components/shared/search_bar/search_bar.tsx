/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import type { DomainDeprecationDetails } from 'kibana/public';
import { DeprecationInfo } from '../../../../../common/types';
import { validateRegExpString } from '../../../lib/utils';
import { GroupByOption, LevelFilterOption } from '../../types';
import { DeprecationLevelFilter } from './level_filter';
import { GroupByFilter } from './group_by_filter';

interface SearchBarProps {
  allDeprecations?: DeprecationInfo[] | DomainDeprecationDetails;
  isLoading: boolean;
  loadData: () => void;
  currentFilter: LevelFilterOption;
  onFilterChange: (filter: LevelFilterOption) => void;
  onSearchChange: (filter: string) => void;
  totalDeprecationsCount: number;
  levelToDeprecationCountMap: {
    [key: string]: number;
  };
  groupByFilterProps?: {
    availableGroupByOptions: GroupByOption[];
    currentGroupBy: GroupByOption;
    onGroupByChange: (groupBy: GroupByOption) => void;
  };
}

const i18nTexts = {
  searchAriaLabel: i18n.translate(
    'xpack.upgradeAssistant.deprecationListSearchBar.placeholderAriaLabel',
    { defaultMessage: 'Filter' }
  ),
  searchPlaceholderLabel: i18n.translate(
    'xpack.upgradeAssistant.deprecationListSearchBar.placeholderLabel',
    {
      defaultMessage: 'Filter',
    }
  ),
  reloadButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.deprecationListSearchBar.reloadButtonLabel',
    {
      defaultMessage: 'Reload',
    }
  ),
  getInvalidSearchMessage: (searchTermError: string) =>
    i18n.translate('xpack.upgradeAssistant.deprecationListSearchBar.filterErrorMessageLabel', {
      defaultMessage: 'Filter invalid: {searchTermError}',
      values: { searchTermError },
    }),
};

export const SearchBar: FunctionComponent<SearchBarProps> = ({
  totalDeprecationsCount,
  levelToDeprecationCountMap,
  isLoading,
  loadData,
  currentFilter,
  onFilterChange,
  onSearchChange,
  groupByFilterProps,
}) => {
  const [searchTermError, setSearchTermError] = useState<null | string>(null);
  const filterInvalid = Boolean(searchTermError);
  return (
    <>
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                isInvalid={filterInvalid}
                aria-label={i18nTexts.searchAriaLabel}
                placeholder={i18nTexts.searchPlaceholderLabel}
                onChange={(e) => {
                  const string = e.target.value;
                  const errorMessage = validateRegExpString(string);
                  if (errorMessage) {
                    // Emit an empty search term to listeners if search term is invalid.
                    onSearchChange('');
                    setSearchTermError(errorMessage);
                  } else {
                    onSearchChange(e.target.value);
                    if (searchTermError) {
                      setSearchTermError(null);
                    }
                  }
                }}
              />
            </EuiFlexItem>

            {/* These two components provide their own EuiFlexItem wrappers */}
            <DeprecationLevelFilter
              {...{
                totalDeprecationsCount,
                levelsCount: levelToDeprecationCountMap,
                currentFilter,
                onFilterChange,
              }}
            />
            {groupByFilterProps && <GroupByFilter {...groupByFilterProps} />}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={loadData} iconType="refresh" isLoading={isLoading}>
            {i18nTexts.reloadButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {filterInvalid && (
        <>
          <EuiSpacer />

          <EuiCallOut
            color="danger"
            title={i18nTexts.getInvalidSearchMessage(searchTermError!)}
            iconType="faceSad"
          />
        </>
      )}

      <EuiSpacer />
    </>
  );
};
