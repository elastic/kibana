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
  const { size } = euiTheme;

  return useMemo(() => {
    const options: CSSObject = {
      position: 'absolute',
      top: size.m,
      right: size.m,
    };

    return { options };
  }, [size.m]);
};
