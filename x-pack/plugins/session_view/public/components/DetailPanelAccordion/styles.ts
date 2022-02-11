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
    const tabSection: CSSObject = {
      padding: '16px',
    };

    const accordion: CSSObject = {
      borderTop: '1px solid #D4DAE5',
      '&:last-child': {
        borderBottom: '1px solid #D4DAE5',
      },
    };

    const accordionButton: CSSObject = {
      padding: '16px',
      fontWeight: 700,
    };

    return {
      accordion,
      accordionButton,
      tabSection,
    };
  }, []);

  return cached;
};
