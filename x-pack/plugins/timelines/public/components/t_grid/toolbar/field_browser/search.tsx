/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldSearch } from '@elastic/eui';
import * as i18n from './translations';
interface Props {
  isSearching: boolean;
  onSearchInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchInput: string;
  timelineId: string;
}

const inputRef = (node: HTMLInputElement | null) => node?.focus();

export const Search = React.memo<Props>(
  ({ isSearching, onSearchInputChange, searchInput, timelineId }) => (
    <EuiFieldSearch
      data-test-subj="field-search"
      inputRef={inputRef}
      isLoading={isSearching}
      onChange={onSearchInputChange}
      placeholder={i18n.FILTER_PLACEHOLDER}
      value={searchInput}
      fullWidth
    />
  )
);
Search.displayName = 'Search';
