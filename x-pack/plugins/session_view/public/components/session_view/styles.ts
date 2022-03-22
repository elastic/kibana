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
    const processTree: CSSObject = {
      height: `${height}px`,
      position: 'relative',
    };

    const detailPanel: CSSObject = {
      height: `${height}px`,
      borderLeft: `${euiTheme.border.thin} !important`,
      boxShadow: '0px 0px 0px #D3DAE6 inset !important',
    };

    const searchBar: CSSObject = {
      position: 'relative',
      margin: `${euiTheme.size.m} ${euiTheme.size.xs} !important`,
    };

    const buttonsEyeDetail: CSSObject = {
      margin: `${euiTheme.size.m} ${euiTheme.size.xs} !important`,
    };

    const sessionViewerComponent: CSSObject = {
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
    };

    const toolBar: CSSObject = {
      backgroundColor: `#EEF2F7 !important`,
    };

    return {
      processTree,
      detailPanel,
      searchBar,
      buttonsEyeDetail,
      sessionViewerComponent,
      toolBar,
    };
  }, [height, euiTheme]);

  return cached;
};
