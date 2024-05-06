/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

interface StylesDeps {
  hasSearchResults: boolean;
}

export const useStyles = ({ hasSearchResults }: StylesDeps) => {
  const { euiTheme, euiVars } = useEuiTheme();

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
      color: euiTheme.colors.subduedText,
      top: euiTheme.size.m,
      right: euiTheme.size.xxl,
    };

    const searchBar: CSSObject = {
      position: 'relative',
      backgroundColor: euiVars.euiFormBackgroundColor,
      input: {
        paddingRight: hasSearchResults ? '200px' : euiTheme.size.xxl,
      },
    };

    return {
      pagination,
      searchBar,
      noResults,
    };
  }, [euiTheme, euiVars, hasSearchResults]);

  return cached;
};
