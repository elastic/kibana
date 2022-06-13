/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { transparentize, useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, font, size } = euiTheme;
    const defaultSelectionColor = colors.primary;

    const scroller: CSSObject = {
      position: 'relative',
      fontFamily: font.familyCode,
      overflow: 'auto',
      height: '100%',
      backgroundColor: colors.lightestShade,
      paddingTop: size.base,
      paddingLeft: size.s,
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
      transform: `translateY(-${size.xs})`,
    };

    const defaultSelected = transparentize(colors.primary, 0.008);
    const alertSelected = transparentize(colors.danger, 0.008);

    return {
      scroller,
      selectionArea,
      defaultSelected,
      alertSelected,
    };
  }, [euiTheme]);

  return cached;
};
