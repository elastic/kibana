/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

const TREE_INDENT = 32;

interface StylesDeps {
  depth: number;
}

export const useStyles = ({ depth }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const darkText = `
      color: ${euiTheme.colors.text};
    `;

    const searchHighlight = `
      background-color: ${euiTheme.colors.highlight};
      color: ${euiTheme.colors.text};
      border-radius: 4px;
    `;

    const children = `
      position: relative;
      color: white;
      margin-left: 16px;
      padding-left: 8px;
      border-left: 3px dotted ${euiTheme.colors.lightShade};
      margin-top: 8px;

      &:after {
        position: absolute;
        content: '';
        bottom: 0;
        left: -5px;
        background-color: ${euiTheme.colors.lightShade};
        width: 7px;
        height: 3px;
        border-radius: 2px;
      }
    `;

    const button = `
      line-height: 18px;
      height: 20px;
      font-size: 11px;
      font-family: Roboto Mono;
      border-radius: 4px;
      background: rgba(0, 119, 204, 0.1);
      border: 1px solid rgba(96, 146, 192, 0.3);
      color: ${euiTheme.colors.text};
      margin-left: 8px;
    `;

    const buttonArrow = `
      margin-left: 8px;
    `;

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

    const processNode = `
      display: block;
      cursor: pointer;
      position: relative;

      &:not(:first-child) {
        margin-top: 8px;
      }

      &:hover:before {
        opacity: 0.24;
        background-color: ${hoverColor};
      }

      &:before {
        position: absolute;
        height: 100%;
        pointer-events: none;
        content: '';
        margin-left: -${depth * TREE_INDENT}px;
        border-left: 4px solid ${borderColor};
        background-color: ${bgColor};
        width: calc(100% + ${depth * TREE_INDENT}px);
      }
    `;

    const wrapper = `
      padding-left: 8px;
      position: relative;
      vertical-align: middle;
      color: ${euiTheme.colors.mediumShade};
      word-break: break-all;
      min-height: 24px;
      line-height: 24px;
    `;

    const workingDir = `
      color: ${euiTheme.colors.successText};
    `;

    const userEnteredIcon = `
      position: absolute;
      width: 9px;
      height: 9px;
      margin-left: -11px;
      margin-top: 8px;
    `;

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
  }, [depth, euiTheme]);

  return cached;
};
