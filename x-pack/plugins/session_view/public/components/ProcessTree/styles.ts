/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const defaultSelectionColor = euiTheme.colors.accent;
    const padding = euiTheme.size.s;

    const scroller = `
      font-family: ${euiTheme.font.familyCode};
      overflow: auto;
      height: 100%;
      background-color: ${euiTheme.colors.lightestShade};
      padding-top: ${padding};
      padding-left: ${padding};
      padding-bottom: ${padding};
      display: flex;
      flex-direction: column;
    `;

    const selectionArea = `
      position: absolute;
      display: none;
      margin-left: -50%;
      width: 150%;
      height: 100%;
      background-color: ${defaultSelectionColor};
      pointer-events:none;
      opacity: .1;
    `;

    return {
      scroller,
      selectionArea,
    };
  }, [euiTheme]);

  return cached;
};
