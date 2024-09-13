/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface Props {
  isLoading: boolean;
  onSearch: ({ searchValue }: { searchValue: string }) => void;
}

const SEARCH_LABEL = i18n.translate('xpack.investigateApp.investigationList.searchField.label', {
  defaultMessage: 'Search...',
});

export function SearchBar({ onSearch, isLoading }: Props) {
  return (
    <EuiFlexGroup direction="row" gutterSize="m">
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          isClearable
          data-test-subj="investigateAppInvestigationListFieldSearch"
          placeholder={SEARCH_LABEL}
          aria-label={SEARCH_LABEL}
          onSearch={(value: string) => onSearch({ searchValue: value })}
          isLoading={isLoading}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
