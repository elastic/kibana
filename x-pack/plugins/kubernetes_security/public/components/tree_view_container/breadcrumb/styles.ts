/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, size, font, border } = euiTheme;

    const breadcrumb: CSSObject = {
      borderBottom: border.thin,
      borderColor: colors.lightShade,
      paddingBottom: size.s,
      marginBottom: size.m,
    };

    const breadcrumbButton: CSSObject = {
      height: 'fit-content',
      maxWidth: '248px',
      fontSize: size.m,
      fontWeight: font.weight.regular,
      '.euiButtonEmpty__content': {
        paddingLeft: size.xs,
        paddingRight: size.xs,
      },
    };

    const breadcrumbButtonBold: CSSObject = {
      ...breadcrumbButton,
      fontWeight: font.weight.semiBold,
    };

    const breadcrumbRightIcon: CSSObject = {
      marginRight: size.xs,
    };

    const breadcrumbIconColor = (color: string): CSSObject => ({
      color,
    });

    return {
      breadcrumb,
      breadcrumbButton,
      breadcrumbButtonBold,
      breadcrumbRightIcon,
      breadcrumbIconColor,
    };
  }, [euiTheme]);

  return cached;
};
