/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { transparentize } from '@elastic/eui';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, font, colors } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'auto',
      height: '100%',
      minHeight: '250px',
      position: 'relative',
      marginBottom: size.l,
    };

    const dataInfo: CSSObject = {
      marginBottom: size.xs,
      display: 'flex',
      alignItems: 'center',
      height: size.l,
      position: 'relative',
    };

    const filters: CSSObject = {
      marginLeft: size.s,
      position: 'absolute',
      left: '50%',
      backgroundColor: colors.emptyShade,
      borderRadius: euiTheme.border.radius.small,
      border: euiTheme.border.thin,
      bottom: '-25px',
      boxShadow: `0 ${size.xs} ${size.xs} ${transparentize(euiTheme.colors.shadow, 0.04)}`,
    };

    const countValue: CSSObject = {
      fontWeight: font.weight.semiBold,
    };

    return {
      container,
      dataInfo,
      filters,
      countValue,
    };
  }, [euiTheme]);

  return cached;
};
