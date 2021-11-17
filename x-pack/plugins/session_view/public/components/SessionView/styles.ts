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
    // const { colors, border, font, size } = euiTheme;
    const padding = euiTheme.size.s;

    const processTree: CSSObject = {
      height: `${height}px`,
    };

    const outerPanel: CSSObject = {
      fontFamily: euiTheme.font.familyCode,
      position: 'relative',
      overflowX: 'hidden',
    };

    const treePanel: CSSObject = {
      paddingTop: padding,
      paddingLeft: padding,
    };

    const slideIn = keyframes({
      to: {
        right: '0',
      }
    });
    
    const slideOut = keyframes({
      from: {
        right: '0',
      },
      to: {
        right: '-100%',
      }
    });
    
    const detailPanel: CSSObject = {
      width: '424px',
      height: `${height}px`,
      overflowY: 'auto',
      position: 'absolute',
      top: '8px',
      right: '-100%',
    };

    const detailPanelIn: Array<string | CSSObject> = [
      slideIn.styles,
      {
        ...detailPanel,
        animation: `${slideIn.name} 200ms ease forwards`,
      },
    ];
    
    const detailPanelOut: Array<string | CSSObject> = [
      slideOut.styles,
      {
        ...detailPanel,
        animation: `${slideOut.name} 150ms ease`,
      },
    ];

    return {
      processTree,
      outerPanel,
      treePanel,
      detailPanelIn,
      detailPanelOut,
    };
  }, [euiTheme]);

  return cached;
};
