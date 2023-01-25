/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { colors, size, border } = euiTheme;

  return useMemo(() => {
    const accordion: CSSObject = {
      borderRadius: border.radius.small,
      backgroundColor: colors.lightestShade,
      '> .euiAccordion__triggerWrapper': {
        padding: size.m,
      },
    };

    return { accordion };
  }, [border.radius.small, colors.lightestShade, size.m]);
};
