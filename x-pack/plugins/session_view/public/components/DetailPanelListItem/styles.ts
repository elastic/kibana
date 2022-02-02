/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  display: string | undefined;
}

export const useStyles = ({ display }: StylesDeps) => {
  const cached = useMemo(() => {
    const item: CSSObject = {
      display,
      alignItems: 'center',
      padding: '8px',
      width: '100%',
      fontSize: 'inherit',
      fontWeight: 'inherit',
      minHeight: '36px',
    };

    const copiableItem: CSSObject = {
      ...item,
      position: 'relative',
      borderRadius: '6px',
      '&:hover': {
        background: '#0077CC1A',
      },
    };

    return {
      item,
      copiableItem,
    };
  }, [display]);

  return cached;
};
