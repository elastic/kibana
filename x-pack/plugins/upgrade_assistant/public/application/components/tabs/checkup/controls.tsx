/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { GroupByOption, LevelFilterOption, LoadingState } from '../../types';
import { FilterBar } from './filter_bar';
import { GroupByBar } from './group_by_bar';

import { validateRegExpString } from '../../../utils';

interface CheckupControlsProps {
  allDeprecations?: DeprecationInfo[];
  loadingState: LoadingState;
  loadData: () => void;
  currentFilter: LevelFilterOption;
  onFilterChange: (filter: LevelFilterOption) => void;
  onSearchChange: (filter: string) => void;
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export const CheckupControls: FunctionComponent<CheckupControlsProps> = ({
  allDeprecations,
  loadingState,
  loadData,
  currentFilter,
  onFilterChange,
  onSearchChange,
  availableGroupByOptions,
  currentGroupBy,
  onGroupByChange,
}) => {
  const [searchTermError, setSearchTermError] = useState<null | string>(null);
  const filterInvalid = Boolean(searchTermError);
  return (
    <EuiFlexGroup direction="column" responsive={false}>
      <EuiFlexItem grow={true}>
        <EuiFlexGroup alignItems="center" wrap={true} responsive={false}>
          <EuiFlexItem>
            <EuiFieldSearch
              isInvalid={filterInvalid}
              aria-label={i18n.translate(
                'xpack.upgradeAssistant.checkupTab.controls.searchBarPlaceholderAriaLabel',
                { defaultMessage: 'Filter' }
              )}
              placeholder={i18n.translate(
                'xpack.upgradeAssistant.checkupTab.controls.searchBarPlaceholder',
                {
                  defaultMessage: 'Filter',
                }
              )}
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
          <FilterBar {...{ allDeprecations, currentFilter, onFilterChange }} />
          <GroupByBar {...{ availableGroupByOptions, currentGroupBy, onGroupByChange }} />

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={loadData}
              iconType="refresh"
              isLoading={loadingState === LoadingState.Loading}
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.controls.refreshButtonLabel"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {filterInvalid && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            color="danger"
            title={i18n.translate(
              'xpack.upgradeAssistant.checkupTab.controls.filterErrorMessageLabel',
              {
                defaultMessage: 'Filter invalid: {searchTermError}',
                values: { searchTermError },
              }
            )}
            iconType="faceSad"
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
