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
    const { border } = euiTheme;

    const outerPanel: CSSObject = {
      minHeight: '262px',
    };

    const navPanel: CSSObject = {
      borderRight: border.thin,
    };

    const sessionsPanel: CSSObject = {
      overflowX: 'auto',
    };

    return {
      outerPanel,
      navPanel,
      sessionsPanel,
    };
  }, [euiTheme]);

  return cached;
};
