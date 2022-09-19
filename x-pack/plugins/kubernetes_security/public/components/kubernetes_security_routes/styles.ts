/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, font } = euiTheme;

    const titleSection: CSSObject = {
      marginBottom: size.l,
    };

    const titleText: CSSObject = {
      display: 'flex',
      alignItems: 'center',
    };

    const titleActions: CSSObject = {
      marginLeft: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
    };

    const updatedAt: CSSObject = {
      marginRight: size.m,
    };

    const widgetBadge: CSSObject = {
      position: 'absolute',
      bottom: size.base,
      left: size.base,
      width: `calc(100% - ${size.xl})`,
      fontSize: size.m,
      lineHeight: '18px',
      padding: `${size.xs} ${size.s}`,
      display: 'flex',
    };

    const treeViewContainer: CSSObject = {
      position: 'relative',
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      padding: size.base,
      height: '500px',
    };

    const widgetsBottomSpacing: CSSObject = {
      marginBottom: size.m,
    };

    const countWidgetsGroup: CSSObject = {
      ...widgetsBottomSpacing,
      flexWrap: 'wrap',
      [`@media (max-width:${euiTheme.breakpoint.xl}px)`]: {
        flexDirection: 'column',
      },
    };

    const leftWidgetsGroup: CSSObject = {
      [`@media (max-width:${euiTheme.breakpoint.xl}px)`]: {
        marginBottom: '0 !important',
      },
      minWidth: `calc(70% - ${size.xxxl})`,
    };

    const rightWidgetsGroup: CSSObject = {
      [`@media (max-width:${euiTheme.breakpoint.xl}px)`]: {
        marginTop: '0 !important',
      },
      minWidth: '30%',
    };

    const percentageChartTitle: CSSObject = {
      marginRight: size.xs,
      display: 'inline',
      fontWeight: font.weight.bold,
    };

    const widgetsGroup: CSSObject = {
      [`@media (max-width:${euiTheme.breakpoint.xl}px)`]: {
        flexDirection: 'column',
      },
    };

    const betaBadge: CSSObject = {
      marginLeft: size.m,
    };

    return {
      titleSection,
      titleText,
      titleActions,
      updatedAt,
      widgetBadge,
      treeViewContainer,
      countWidgetsGroup,
      leftWidgetsGroup,
      rightWidgetsGroup,
      widgetsBottomSpacing,
      percentageChartTitle,
      widgetsGroup,
      betaBadge,
    };
  }, [euiTheme]);

  return cached;
};
