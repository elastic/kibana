/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, font, border } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: border.thin,
      borderRadius: border.radius.medium,
      overflow: 'auto',
      position: 'relative',
      height: '100%',
    };

    const title: CSSObject = {
      marginBottom: size.s,
      fontSize: size.m,
      fontWeight: font.weight.bold,
      whiteSpace: 'nowrap',
    };

    const dataInfo: CSSObject = {
      fontSize: `calc(${size.l} - ${size.xxs})`,
      lineHeight: size.l,
      fontWeight: font.weight.bold,
    };

    const dataValue: CSSObject = {
      fontWeight: font.weight.semiBold,
      marginLeft: 'auto',
    };

    const filters: CSSObject = {
      marginLeft: size.s,
    };

    const loadingSpinner: CSSObject = {
      alignItems: 'center',
      margin: `${size.xs} auto ${size.xl} auto`,
    };

    return {
      container,
      title,
      dataInfo,
      dataValue,
      filters,
      loadingSpinner,
    };
  }, [euiTheme]);

  return cached;
};
