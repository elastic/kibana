/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { keyframes, CSSObject } from '@emotion/react';

interface StylesDeps {
  height: number | undefined;
}

export const useStyles = ({ height = 500 }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { animation } = euiTheme;
    const detailPanelSize = '424px';

    const slideIn = keyframes({
      from: {
        left: '100%',
      },
      to: {
        left: `calc(100% - ${detailPanelSize})`,
      },
    });

    const slideOut = keyframes({
      from: {
        left: `calc(100% - ${detailPanelSize})`,
      },
      to: {
        left: '100%',
      },
    });

    const detailPanel: CSSObject = {
      width: detailPanelSize,
      height: `${height}px`,
      overflowY: 'auto',
      position: 'absolute',
      top: '8px',
      left: '100%',
    };

    const detailPanelIn: CSSObject = {
      ...detailPanel,
      animation: `${slideIn} ${animation.normal} ease forwards`,
    };

    const detailPanelOut: CSSObject = {
      ...detailPanel,
      animation: `${slideOut} ${animation.fast} ease forwards`,
    };

    return {
      detailPanelIn,
      detailPanelOut,
    };
  }, [height, euiTheme]);

  return cached;
};
