/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  isDisplayedAbove: boolean;
}

export const useStyles = ({ isDisplayedAbove }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { size, colors, font } = euiTheme;

    const buttonBackgroundColor = colors.primary;

    const container: CSSObject = {
      position: 'absolute',
      height: size.xxxxl,
      width: '100%',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const jumpBackBadge: CSSObject = {
      position: 'sticky',
      pointerEvents: 'auto',
      cursor: 'pointer',
      fontWeight: font.weight.regular,
    };

    if (isDisplayedAbove) {
      container.top = 0;
      container.background = `linear-gradient(180deg, ${theme.euiColorLightestShade} 0%, transparent 100%)`;
    } else {
      container.bottom = 0;
      container.background = `linear-gradient(360deg, ${theme.euiColorLightestShade} 0%, transparent 100%)`;
    }

    return {
      container,
      jumpBackBadge,
      buttonBackgroundColor,
    };
  }, [isDisplayedAbove, euiTheme]);

  return cached;
};
