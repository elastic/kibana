/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

export const useStyles = () => {
  return useMemo(() => {
    const panel: CSSObject = {
      position: 'relative',
    };

    const draggable: CSSObject = {
      // setting manually as the spacing of selectors doesn't match with built in sizes
      padding: 0,
      paddingBottom: '12px',
    };

    const hide: CSSObject = {
      display: 'none',
    };

    return { panel, draggable, hide };
  }, []);
};
