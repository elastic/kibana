/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject, css } from '@emotion/react';
import { transparentize } from '@elastic/eui';
import { useEuiTheme } from '../../hooks';
import { Teletype } from '../../../common/types/process_tree';

export const useStyles = (tty?: Teletype) => {
  const { euiTheme } = useEuiTheme();
  const cached = useMemo(() => {
    const { size, font, colors, border } = euiTheme;

    const container: CSSObject = {
      position: 'absolute',
      top: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      zIndex: 10,
      borderRadius: size.s,
      backgroundColor: colors.ink,
      '.euiRangeLevel--warning': {
        backgroundColor: transparentize(colors.warning, 0.8),
      },
      '.euiRangeLevel--danger': {
        backgroundColor: transparentize(colors.danger, 0.8),
      },
      '.euiRangeTick,.euiRangeLevel': {
        transition: 'left 500ms',
      },
    };

    const windowBoundsColor = transparentize(colors.ghost, 0.6);

    const terminal: CSSObject = {
      minHeight: '100%',
      '.xterm': css`
        display: inline-block;
      `,
      '.xterm-screen': css`
        overflow-y: visible;
        border: ${border.width.thin} dotted ${windowBoundsColor};
        border-top: 0;
        border-left: 0;
        box-sizing: content-box;
      `,
    };

    if (tty?.rows) {
      terminal['.xterm-screen:after'] = css`
        position: absolute;
        right: ${size.s};
        top: ${size.s};
        content: '${tty?.columns}x${tty?.rows}';
        color: ${windowBoundsColor};
        font-family: ${font.familyCode};
        font-size: ${size.m};
      `;
    }

    const scrollPane: CSSObject = {
      width: '100%',
      height: 'calc(100% - 142px)',
      border: border.thin,
      overflow: 'auto',
    };

    return {
      container,
      terminal,
      scrollPane,
    };
  }, [tty, euiTheme]);

  return cached;
};
