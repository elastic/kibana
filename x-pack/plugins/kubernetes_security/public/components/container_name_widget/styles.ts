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
    const { size, colors } = euiTheme;

    const container: CSSObject = {
      paddingTop: size.s,
      paddingBottom: size.s,
      paddingRight: size.base,
      paddingLeft: size.base,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'auto',
      height: '228px',
      position: 'relative',
      marginBottom: size.l,
    };

    const dataInfo: CSSObject = {
      display: 'flex',
      alignItems: 'center',
      height: size.base,
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
      display: 'flex',
      zIndex: 1,
    };

    const countValue: CSSObject = {
      fontSize: size.m,
    };

    const truncate: CSSObject = {
      width: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    };

    const flexWidth: CSSObject = {
      width: '100%',
    };

    const cellPad: CSSObject = {
      paddingBottom: '5px',
      paddingTop: '5px',
    };

    return {
      container,
      dataInfo,
      filters,
      countValue,
      truncate,
      flexWidth,
      cellPad,
    };
  }, [euiTheme]);

  return cached;
};
