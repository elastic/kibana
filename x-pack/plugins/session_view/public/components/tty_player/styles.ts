/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject, css } from '@emotion/react';
import { transparentize, useEuiScrollBar } from '@elastic/eui';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const euiScrollBar = useEuiScrollBar();

  const cached = useMemo(() => {
    const { size, colors, border } = euiTheme;

    const container: CSSObject = {
      position: 'absolute',
      top: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
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

    const terminal: CSSObject = {
      width: '100%',
      height: 'calc(100% - 142px)',
      '.xterm-viewport': css`
        ${euiScrollBar}
      `,
      border: border.thin,
    };

    return {
      container,
      terminal,
    };
  }, [euiScrollBar, euiTheme]);

  return cached;
};
