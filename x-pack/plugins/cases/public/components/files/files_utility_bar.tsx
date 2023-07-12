/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';
import { TypeFilterPanel } from '@kbn/content-management-table-list-view-table/src/components/type_filter_panel';
import { AddFile } from './add_file';

import * as i18n from './translations';

interface FilesUtilityBarProps {
  caseId: string;
  onSearch: (newSearch: string) => void;
  onSearchType: (newSearch: string[]) => void;
}

export const FilesUtilityBar = ({ caseId, onSearch, onSearchType }: FilesUtilityBarProps) => {
  return (
    <EuiFlexGroup alignItems="center">
      <AddFile caseId={caseId} />
      <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
        <EuiFieldSearch
          fullWidth
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={onSearch}
          incremental={false}
          data-test-subj="cases-files-search"
        />
      </EuiFlexItem>
      <TypeFilterPanel onSearch={onSearchType} />
    </EuiFlexGroup>
  );
};

FilesUtilityBar.displayName = 'FilesUtilityBar';
