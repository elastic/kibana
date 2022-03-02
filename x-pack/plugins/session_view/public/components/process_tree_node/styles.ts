/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme, transparentize } from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  depth: number;
  hasAlerts: boolean;
}

export const enum ButtonType {
  children = 'children',
  alerts = 'alerts',
  output = 'output',
  userChanged = 'user',
}

export const useStyles = ({ depth, hasAlerts }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, border, font, size } = euiTheme;

    const TREE_INDENT = euiTheme.base * 2;

    const darkText: CSSObject = {
      color: colors.text,
    };

    const searchHighlight = `
      background-color: ${colors.highlight};
      color: ${colors.fullShade};
      border-radius: ${border.radius.medium};
    `;

    const children: CSSObject = {
      position: 'relative',
      color: colors.ghost,
      marginLeft: size.base,
      paddingLeft: size.s,
      borderLeft: border.editable,
      marginTop: size.s,
    };

    const button: CSSObject = {
      lineHeight: '18px',
      height: '20px',
      fontSize: '11px',
      fontFamily: font.familyCode,
      borderRadius: border.radius.medium,
      color: colors.text,
      marginLeft: size.s,
      minWidth: 0,
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.s,
    };

    const getButtonStyle = (type: string): CSSObject => {
      let background = transparentize(theme.euiColorVis6, 0.04);
      let borderStyle = `${border.width.thin} solid ${transparentize(theme.euiColorVis6, 0.48)}`;

      switch (type) {
        case ButtonType.alerts:
          background = transparentize(colors.dangerText, 0.04);
          borderStyle = `${border.width.thin} solid ${transparentize(colors.dangerText, 0.48)}`;
          break;
        case ButtonType.userChanged:
        case ButtonType.output:
          background = transparentize(theme.euiColorVis1, 0.04);
          borderStyle = `${border.width.thin} solid ${transparentize(theme.euiColorVis1, 0.48)}`;
          break;
      }

      return {
        ...button,
        background,
        border: borderStyle,
      };
    };

    /**
     * gets border, bg and hover colors for a process
     */
    const getHighlightColors = () => {
      let bgColor = 'none';
      const hoverColor = transparentize(colors.primary, 0.04);
      let borderColor = 'transparent';

      // TODO: alerts highlight colors
      if (hasAlerts) {
        bgColor = transparentize(colors.danger, 0.04);
        borderColor = transparentize(colors.danger, 0.48);
      }

      return { bgColor, borderColor, hoverColor };
    };

    const { bgColor, borderColor, hoverColor } = getHighlightColors();

    const processNode: CSSObject = {
      display: 'block',
      cursor: 'pointer',
      position: 'relative',
      margin: `${size.s} 0px`,
      '&:not(:first-child)': {
        marginTop: size.s,
      },
      '&:hover:before': {
        backgroundColor: hoverColor,
      },
      '&:before': {
        position: 'absolute',
        height: '100%',
        pointerEvents: 'none',
        content: `''`,
        marginLeft: `-${depth * TREE_INDENT}px`,
        borderLeft: `${size.xs} solid ${borderColor}`,
        backgroundColor: bgColor,
        width: `calc(100% + ${depth * TREE_INDENT}px)`,
      },
    };

    const wrapper: CSSObject = {
      paddingLeft: size.s,
      position: 'relative',
      verticalAlign: 'middle',
      color: colors.mediumShade,
      wordBreak: 'break-all',
      minHeight: size.l,
      lineHeight: size.l,
    };

    const workingDir: CSSObject = {
      color: colors.successText,
    };

    const alertDetails: CSSObject = {
      padding: size.s,
      border: border.editable,
      borderRadius: border.radius.medium,
    };

    return {
      darkText,
      searchHighlight,
      children,
      processNode,
      wrapper,
      workingDir,
      buttonArrow,
      getButtonStyle,
      alertDetails,
    };
  }, [depth, euiTheme, hasAlerts]);

  return cached;
};
