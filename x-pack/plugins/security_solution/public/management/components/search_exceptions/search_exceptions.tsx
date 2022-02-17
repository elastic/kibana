/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PolicySelectionItem, PoliciesSelector } from '../policies_selector';
import { ImmutableArray, PolicyData } from '../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../common/components/user_privileges';

export interface SearchExceptionsProps {
  defaultValue?: string;
  placeholder: string;
  hasPolicyFilter?: boolean;
  policyList?: ImmutableArray<PolicyData>;
  defaultIncludedPolicies?: string;
  hideRefreshButton?: boolean;
  onSearch(query: string, includedPolicies?: string): void;
}

export const SearchExceptions = memo<SearchExceptionsProps>(
  ({
    defaultValue = '',
    onSearch,
    placeholder,
    hasPolicyFilter,
    policyList,
    defaultIncludedPolicies,
    hideRefreshButton = false,
  }) => {
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const [query, setQuery] = useState<string>(defaultValue);
    const [includedPolicies, setIncludedPolicies] = useState<string>(defaultIncludedPolicies || '');

    const onChangeSelection = useCallback(
      (items: PolicySelectionItem[]) => {
        const includePoliciesNew = items
          .filter((item) => item.checked === 'on')
          .map((item) => item.id)
          .join(',');

        setIncludedPolicies(includePoliciesNew);

        onSearch(query, includePoliciesNew);
      },
      [onSearch, query]
    );

    const handleOnChangeSearchField = useCallback(
      (ev: React.ChangeEvent<HTMLInputElement>) => setQuery(ev.target.value),
      [setQuery]
    );
    const handleOnSearch = useCallback(
      () => onSearch(query, includedPolicies),
      [onSearch, query, includedPolicies]
    );

    const handleOnSearchQuery = useCallback(
      (value) => {
        onSearch(value, includedPolicies);
      },
      [onSearch, includedPolicies]
    );

    return (
      <EuiFlexGroup
        data-test-subj="searchExceptions"
        direction="row"
        alignItems="center"
        gutterSize="m"
      >
        <EuiFlexItem>
          <EuiFieldSearch
            defaultValue={defaultValue}
            placeholder={placeholder}
            onChange={handleOnChangeSearchField}
            onSearch={handleOnSearchQuery}
            isClearable
            fullWidth
            data-test-subj="searchField"
          />
        </EuiFlexItem>
        {canCreateArtifactsByPolicy && hasPolicyFilter && policyList ? (
          <EuiFlexItem grow={false}>
            <PoliciesSelector
              policies={policyList}
              defaultIncludedPolicies={defaultIncludedPolicies}
              onChangeSelection={onChangeSelection}
            />
          </EuiFlexItem>
        ) : null}

        {!hideRefreshButton ? (
          <EuiFlexItem grow={false} onClick={handleOnSearch} data-test-subj="searchButton">
            <EuiButton iconType="refresh">
              {i18n.translate('xpack.securitySolution.management.search.button', {
                defaultMessage: 'Refresh',
              })}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);

SearchExceptions.displayName = 'SearchExceptions';
