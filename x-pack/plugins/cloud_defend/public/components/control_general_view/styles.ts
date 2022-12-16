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
      paddingLeft: 0,
      paddingRight: 0,
    };

    return { panel, draggable };
  }, []);
};
