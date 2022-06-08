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
  isInvestigated: boolean;
  isSelected: boolean;
}

export const useStyles = () => {
  const { euiTheme, euiVars } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, font } = euiTheme;

    const container: CSSObject = {
      padding: size.base,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
    };

    const title: CSSObject = {
      marginBottom: size.m,
    };

    const dataInfo: CSSObject = {
      marginBottom: size.xs,
    };

    const dataValue: CSSObject = {
      fontWeight: font.weight.semiBold,
      float: 'right',
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

    return {
      container,
      title,
      dataInfo,
      dataValue,
      percentageBackground,
      percentageBar,
    };
  }, [euiTheme]);

  return cached;
};
