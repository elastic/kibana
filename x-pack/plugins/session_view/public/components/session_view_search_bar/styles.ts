/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  hasSearchResults: boolean;
}

export const useStyles = ({ hasSearchResults }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const pagination: CSSObject = {
      position: 'absolute',
      top: euiTheme.size.s,
      right: euiTheme.size.xxl,
      'button[data-test-subj="pagination-button-last"]': {
        display: 'none',
      },
      'button[data-test-subj="pagination-button-first"]': {
        display: 'none',
      },
    };

    const noResults: CSSObject = {
      position: 'absolute',
      color: euiTheme.colors.subdued,
      top: euiTheme.size.m,
      right: euiTheme.size.xxl,
    };

    const searchBarWithResult: CSSObject = {
      position: 'relative',
      'input.euiFieldSearch.euiFieldSearch-isClearable': {
        paddingRight: hasSearchResults ? '200px' : euiTheme.size.xxl,
      },
    };

    return {
      pagination,
      searchBarWithResult,
      noResults,
    };
  }, [euiTheme, hasSearchResults]);

  return cached;
};
