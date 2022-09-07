/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSearchBarProps } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';

import * as i18n from './translations';

interface ExceptionListsTableSearchProps {
  onSearch: (args: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => void;
}

export const EXCEPTIONS_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    created_by: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    type: {
      type: 'string',
    },
    list_id: {
      type: 'string',
    },
    tags: {
      type: 'string',
    },
  },
};

export const ExceptionsSearchBar = React.memo<ExceptionListsTableSearchProps>(({ onSearch }) => {
  return (
    <EuiSearchBar
      data-test-subj="exceptionsHeaderSearch"
      aria-label={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
      onChange={onSearch}
      box={{
        [`data-test-subj`]: 'exceptionsHeaderSearchInput',
        placeholder: i18n.EXCEPTION_LIST_SEARCH_PLACEHOLDER,
        incremental: false,
        schema: EXCEPTIONS_SEARCH_SCHEMA,
      }}
    />
  );
});

ExceptionsSearchBar.displayName = 'ExceptionsSearchBar';
