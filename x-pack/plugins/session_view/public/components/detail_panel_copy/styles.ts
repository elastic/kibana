/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  const cached = useMemo(() => {
    const copyButton: CSSObject = {
      position: 'absolute',
      right: '8px',
      top: 0,
      bottom: 0,
      margin: 'auto',
    };

    return {
      copyButton,
    };
  }, []);

  return cached;
};
