/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, font } = euiTheme;

    const alert: CSSObject = {
      fontFamily: font.family,
      display: 'flex',
      alignItems: 'center',
      height: '20px',
      padding: `${size.xs} 0`,
      boxSizing: 'content-box',
      '&:not(:last-child)': {
        marginBottom: size.s,
      },
    };

    const alertRowItem: CSSObject = {
      '&:first-child': {
        marginRight: size.m,
      },
      '&:not(:first-child)': {
        marginRight: size.s,
      },
    };

    return {
      alert,
      alertRowItem,
    };
  }, [euiTheme]);

  return cached;
};
