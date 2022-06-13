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
    const { size, colors, font } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'auto',
    };

    const title: CSSObject = {
      marginBottom: size.m,
    };

    const dataInfo: CSSObject = {
      marginBottom: size.xs,
      display: 'flex',
      alignItems: 'center',
      height: '18px',
    };

    const dataValue: CSSObject = {
      fontWeight: font.weight.semiBold,
      marginLeft: 'auto',
    };

    const filters: CSSObject = {
      marginLeft: size.s,
    };

    const percentageBackground: CSSObject = {
      position: 'relative',
      backgroundColor: colors.lightShade,
      height: '4px',
      borderRadius: '2px',
    };

    const percentageBar: CSSObject = {
      position: 'absolute',
      height: '4px',
      borderRadius: '2px',
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
      percentageBackground,
      percentageBar,
      loadingSpinner,
    };
  }, [euiTheme]);

  return cached;
};
