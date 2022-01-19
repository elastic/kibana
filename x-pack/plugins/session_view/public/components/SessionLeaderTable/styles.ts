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
    const rowButtonContainer: CSSObject = {
      display: 'flex',
      alignItems: 'center',
    };

    const rowCheckbox: CSSObject = {
      marginRight: '15px',
    };

    return {
      rowButtonContainer,
      rowCheckbox,
    };
  }, []);

  return cached;
};
