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
    const { border, colors } = euiTheme;

    const thinBorder = `${border.width.thin} solid ${colors.lightShade}!important`;

    const processTree: CSSObject = {
      height: `${height}px`,
      paddingTop: euiTheme.size.s,
      position: 'relative',
    };

    const detailPanel: CSSObject = {
      height: `${height}px`,
      borderLeft: thinBorder,
      borderRight: thinBorder,
    };

    const resizeHandle: CSSObject = {
      zIndex: 2,
    };

    return {
      processTree,
      detailPanel,
      resizeHandle,
    };
  }, [height, euiTheme]);

  return cached;
};
