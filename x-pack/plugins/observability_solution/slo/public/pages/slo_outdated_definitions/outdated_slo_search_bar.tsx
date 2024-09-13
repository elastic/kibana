/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiFieldSearch } from '@elastic/eui';

interface OutdatedSloSearchBarProps {
  initialSearch?: string;
  onRefresh: () => void;
  onSearch: (search: string) => void;
}

export function OutdatedSloSearchBar({
  onSearch,
  onRefresh,
  initialSearch = '',
}: OutdatedSloSearchBarProps) {
  const [tempSearch, setTempSearch] = useState<string>(initialSearch);
  const [search, setSearch] = useState<string>(initialSearch);

  const refreshOrUpdateSearch = () => {
    if (tempSearch !== search) {
      setSearch(tempSearch);
      onSearch(tempSearch);
    } else {
      onRefresh();
    }
  };

  const handleClick = (event: React.ChangeEvent<HTMLInputElement>) =>
    setTempSearch(event.target.value);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      refreshOrUpdateSearch();
    }
  };

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldSearch
          data-test-subj="o11ySlosOutdatedDefinitionsFieldSearch"
          fullWidth
          value={tempSearch}
          onChange={handleClick}
          onKeyDown={handleKeyPress}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        {search === tempSearch && (
          <EuiButton
            data-test-subj="o11ySlosOutdatedDefinitionsRefreshButton"
            iconType="refresh"
            onClick={refreshOrUpdateSearch}
          >
            {i18n.translate('xpack.slo.slosOutdatedDefinitions.refreshButtonLabel', {
              defaultMessage: 'Refresh',
            })}
          </EuiButton>
        )}
        {search !== tempSearch && (
          <EuiButton
            data-test-subj="o11ySlosOutdatedDefinitionsUpdateButton"
            iconType="kqlFunction"
            color="success"
            fill
            onClick={refreshOrUpdateSearch}
          >
            {i18n.translate('xpack.slo.slosOutdatedDefinitions.updateButtonLabel', {
              defaultMessage: 'Update',
            })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
