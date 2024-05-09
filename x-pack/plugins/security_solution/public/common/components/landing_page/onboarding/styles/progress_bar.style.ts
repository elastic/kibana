/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemo } from 'react';

export const useProgressBarStyles = () => {
  const { euiTheme } = useEuiTheme();
  const progressBarStyles = useMemo(
    () => ({
      textStyle: css({
        fontSize: '10.5px',
        fontWeight: euiTheme.font.weight.bold,
        textTransform: 'uppercase',
      }),
    }),
    [euiTheme.font.weight.bold]
  );
  return progressBarStyles;
};
