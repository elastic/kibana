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
import { useEndpointPrivileges } from '../../../common/components/user_privileges/endpoint/use_endpoint_privileges';

export interface SearchExceptionsProps {
  defaultValue?: string;
  placeholder: string;
  hasPolicyFilter?: boolean;
  policyList?: ImmutableArray<PolicyData>;
  defaultExcludedPolicies?: string;
  defaultIncludedPolicies?: string;
  hideRefreshButton?: boolean;
  onSearch(query: string, includedPolicies?: string, excludedPolicies?: string): void;
}

export const SearchExceptions = memo<SearchExceptionsProps>(
  ({
    defaultValue = '',
    onSearch,
    placeholder,
    hasPolicyFilter,
    policyList,
    defaultIncludedPolicies,
    defaultExcludedPolicies,
    hideRefreshButton = false,
  }) => {
    const { isPlatinumPlus } = useEndpointPrivileges();
    const [query, setQuery] = useState<string>(defaultValue);
    const [includedPolicies, setIncludedPolicies] = useState<string>(defaultIncludedPolicies || '');
    const [excludedPolicies, setExcludedPolicies] = useState<string>(defaultExcludedPolicies || '');

    const onChangeSelection = useCallback(
      (items: PolicySelectionItem[]) => {
        const includePoliciesNew = items
          .filter((item) => item.checked === 'on')
          .map((item) => item.id)
          .join(',');
        const excludePoliciesNew = items
          .filter((item) => item.checked === 'off')
          .map((item) => item.id)
          .join(',');

        setIncludedPolicies(includePoliciesNew);
        setExcludedPolicies(excludePoliciesNew);

        onSearch(query, includePoliciesNew, excludePoliciesNew);
      },
      [onSearch, query]
    );

    const handleOnChangeSearchField = useCallback(
      (ev: React.ChangeEvent<HTMLInputElement>) => setQuery(ev.target.value),
      [setQuery]
    );
    const handleOnSearch = useCallback(
      () => onSearch(query, includedPolicies, excludedPolicies),
      [onSearch, query, includedPolicies, excludedPolicies]
    );

    const handleOnSearchQuery = useCallback(
      (value) => {
        onSearch(value, includedPolicies, excludedPolicies);
      },
      [onSearch, includedPolicies, excludedPolicies]
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
        {isPlatinumPlus && hasPolicyFilter && policyList ? (
          <EuiFlexItem grow={false}>
            <PoliciesSelector
              policies={policyList}
              defaultExcludedPolicies={defaultExcludedPolicies}
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
