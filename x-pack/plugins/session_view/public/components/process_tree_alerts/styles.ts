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
    const { size, colors, border } = euiTheme;

    const container: CSSObject = {
      marginTop: size.s,
      marginRight: size.s,
      color: colors.text,
      padding: size.m,
      borderStyle: 'solid',
      borderColor: colors.lightShade,
      borderWidth: border.width.thin,
      borderRadius: border.radius.medium,
      maxWidth: 800,
      backgroundColor: 'white',
    };

    return {
      container,
    };
  }, [euiTheme]);

  return cached;
};
