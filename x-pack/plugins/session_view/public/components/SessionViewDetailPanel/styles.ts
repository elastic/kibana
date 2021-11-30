/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { keyframes, CSSObject } from '@emotion/react';

interface StylesDeps {
  height: number | undefined;
}

export const useStyles = ({ height = 500 }: StylesDeps) => {
  const cached = useMemo(() => {
    const slideIn = keyframes({
      to: {
        right: '0',
      },
    });

    const slideOut = keyframes({
      from: {
        right: '0',
      },
      to: {
        right: '-424px',
      },
    });

    const detailPanel: CSSObject = {
      width: '424px',
      height: `${height}px`,
      overflowY: 'auto',
      position: 'absolute',
      top: '8px',
      right: '-424px',
    };

    const detailPanelIn: CSSObject = {
      ...detailPanel,
      animation: `${slideIn} 200ms ease forwards`,
    };

    const detailPanelOut: CSSObject = {
      ...detailPanel,
      animation: `${slideOut} 150ms ease`,
    };

    return {
      detailPanelIn,
      detailPanelOut,
    };
  }, [height]);

  return cached;
};
