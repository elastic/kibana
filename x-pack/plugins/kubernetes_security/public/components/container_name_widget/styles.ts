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
    const { size, font } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'auto',
      height: '250px',
      minWidth: '332px',
      position: 'relative',
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
      backgroundColor: 'white',
      borderRadius: euiTheme.border.radius.small,
      border: euiTheme.border.thin,
      bottom: '-25px',
      boxShadow: `0 ${size.xs} ${size.xs} ${transparentize(euiTheme.colors.shadow, 0.04)}`,
    };

    const countValue: CSSObject = {
      fontWeight: font.weight.semiBold,
    };

    const tablePadding: CSSObject = {
      width: '332px',
      height: '228px',
      overflow: 'hiddne',
      padding: '9px 8px 16px 16px',
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
    };

    return {
      container,
      dataInfo,
      filters,
      countValue,
      tablePadding,
    };
  }, [euiTheme]);

  return cached;
};
