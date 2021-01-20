/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSearchBar, EuiSearchBarProps } from '@elastic/eui';

import * as i18n from './translations';

interface ExceptionListsTableSearchProps {
  onSearch: (args: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => void;
}

export const ExceptionsSearchBar = React.memo<ExceptionListsTableSearchProps>(({ onSearch }) => {
  const schema = {
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
        validate: (value: string) => {
          if (value !== 'agnostic' && value !== 'single') {
            throw new Error('unknown type (possible values: single, agnostic)');
          }
        },
      },
      list_id: {
        type: 'string',
      },
      tag: {
        type: 'string',
      },
    },
  };

  return (
    <EuiSearchBar
      data-test-subj="exceptionsHeaderSearch"
      aria-label={i18n.EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER}
      onChange={onSearch}
      box={{
        placeholder: 'e.g. Example List Name',
        incremental: false,
        schema,
      }}
    />
  );
});

ExceptionsSearchBar.displayName = 'ExceptionsSearchBar';
