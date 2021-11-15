/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

export const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const padding = euiTheme.size.s;

    const outerPanel = `
      font-family: ${euiTheme.font.familyCode};
      position: relative;
    `;

    const treePanel = `
      padding: ${padding} 0 0 ${padding};
    `;

    const detailPanel = `
      max-width: 424px;
      height: 300px;
      overflow-y: auto;
    `;

    return {
      outerPanel,
      treePanel,
      detailPanel,
    };
  }, [euiTheme]);

  return cached;
};
