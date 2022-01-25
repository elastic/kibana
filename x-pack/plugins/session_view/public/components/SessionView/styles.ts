/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

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

    const pagination: CSSObject = {
      position: 'absolute',
      top: '8px',
      right: '8px',
    }

    return {
      processTree,
      outerPanel,
      treePanel,
      pagination,
    };
  }, [height, euiTheme]);

  return cached;
};
