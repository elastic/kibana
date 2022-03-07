/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
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
      padding: `${size.xs} ${size.base}`,
      boxSizing: 'content-box',
      cursor: 'pointer',
      '&:not(:last-child)': {
        marginBottom: size.s,
      },
      '&:hover': {
        background: `${transparentize(colors.primary, 0.04)}`,
      },
    };

    const selectedAlert: CSSObject = {
      ...alert,
      background: `${transparentize(colors.danger, 0.04)}`,
      '&:hover': {
        background: `${transparentize(colors.danger, 0.12)}`,
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

    const alertStatus: CSSObject = {
      ...alertRowItem,
      textTransform: 'capitalize',
      '&, span': {
        cursor: 'pointer !important',
      },
    };

    return {
      alert,
      alertRowItem,
      alertStatus,
      selectedAlert,
    };
  }, [euiTheme]);

  return cached;
};
