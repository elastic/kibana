/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

const TREE_INDENT = 32;

interface StylesDeps {
  depth: number;
}

export const useStyles = ({ depth }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();
  const { colors, border, font, size } = euiTheme;

  const cached = useMemo(() => {
    const darkText: CSSObject = {
      color: colors.text,
    };

    const searchHighlight = `
      background-color: ${colors.highlight};
      color: ${colors.text};
      border-radius: ${border.radius.medium};
    `;

    const children: CSSObject = {
      position: 'relative',
      color: 'white',
      marginLeft: '16px',
      paddingLeft: '8px',
      borderLeft: `3px dotted ${colors.lightShade}`,
      marginTop: '8px',
      '&:after': {
        position: 'absolute',
        content: `''`,
        bottom: 0,
        left: '-5px',
        backgroundColor: colors.lightShade,
        width: '7px',
        height: '3px',
        borderRadius: '2px',
      },
    };

    const button: CSSObject = {
      lineHeight: '18px',
      height: '20px',
      fontSize: '11px',
      fontFamily: font.familyCode,
      borderRadius: border.radius.medium,
      background: 'rgba(0, 119, 204, 0.1)',
      border: '1px solid rgba(96, 146, 192, 0.3)',
      color: colors.text,
      marginLeft: size.s,
    };

    const buttonArrow: CSSObject = {
      marginLeft: size.s,
    };

    /**
     * gets border, bg and hover colors for a process
     */
    const getHighlightColors = () => {
      const bgColor = 'none';
      const hoverColor = '#6B5FC6';
      const borderColor = 'transparent';

      // TODO: alerts highlight colors

      return { bgColor, borderColor, hoverColor };
    };

    const { bgColor, borderColor, hoverColor } = getHighlightColors();

    const processNode: CSSObject = {
      display: 'block',
      cursor: 'pointer',
      position: 'relative',
      '&:not(:first-child)': {
        marginTop: size.s,
      },
      '&:hover:before': {
        opacity: 0.24,
        backgroundColor: hoverColor,
      },
      '&:before': {
        position: 'absolute',
        height: '100%',
        pointerEvents: 'none',
        content: `''`,
        marginLeft: `-${depth * TREE_INDENT}px`,
        borderLeft: `4px solid ${borderColor}`,
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
      minHeight: '24px',
      lineHeight: '24px',
    };

    const workingDir: CSSObject = {
      color: colors.successText,
    };

    const userEnteredIcon: CSSObject = {
      position: 'absolute',
      width: '9px',
      height: '9px',
      marginLeft: '-11px',
      marginTop: '8px',
    };

    return {
      darkText,
      searchHighlight,
      children,
      button,
      buttonArrow,
      processNode,
      wrapper,
      workingDir,
      userEnteredIcon,
    };
  }, [depth, colors, border, font, size]);

  return cached;
};
