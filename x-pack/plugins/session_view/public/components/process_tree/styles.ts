/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const defaultSelectionColor = euiTheme.colors.accent;

    const scroller: CSSObject = {
      position: 'relative',
      fontFamily: euiTheme.font.familyCode,
      overflow: 'auto',
      height: '100%',
      backgroundColor: euiTheme.colors.lightestShade,
    };

    const selectionArea: CSSObject = {
      position: 'absolute',
      display: 'none',
      marginLeft: '-50%',
      width: '150%',
      height: '100%',
      backgroundColor: defaultSelectionColor,
      pointerEvents: 'none',
      opacity: 0.1,
    };

    return {
      scroller,
      selectionArea,
    };
  }, [euiTheme]);

  return cached;
};
