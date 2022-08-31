/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const cached = useMemo(() => {
    const { size } = euiTheme;

    const controlsPanel: CSSObject = {
      paddingTop: size.s,
      paddingBottom: size.s,
    };

    const controlButton: CSSObject = {
      width: size.l,
    };

    return {
      controlsPanel,
      controlButton,
    };
  }, [euiTheme]);

  return cached;
};
