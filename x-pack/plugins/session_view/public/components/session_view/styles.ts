/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { euiLightVars as theme } from '@kbn/ui-theme';

interface StylesDeps {
  height?: string;
  isFullScreen?: boolean;
}

export const useStyles = ({ height = '500px', isFullScreen }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const { border } = euiTheme;

    // 118px = Session View Toolbar height + Close Session button height + spacing margin at the bottom
    const sessionView: CSSObject = {
      height: `${isFullScreen ? 'calc(100vh - 118px)' : height}`,
    };

    const processTree: CSSObject = {
      ...sessionView,
      position: 'relative',
    };

    const detailPanel: CSSObject = {
      ...sessionView,
      borderRightWidth: '0px',
    };

    const resizeHandle: CSSObject = {
      zIndex: 2,
    };

    const nonGrowGroup: CSSObject = {
      display: 'flex',
      flexGrow: 0,
      alignItems: 'stretch',
    };
    const searchBar: CSSObject = {
      position: 'relative',
      margin: `${euiTheme.size.m} ${euiTheme.size.xs} !important`,
    };

    const buttonsEyeDetail: CSSObject = {
      margin: `${euiTheme.size.m} ${euiTheme.size.xs} !important`,
    };

    const sessionViewerComponent: CSSObject = {
      border: border.thin,
      borderRadius: border.radius.medium,
    };

    const toolBar: CSSObject = {
      backgroundColor: `${theme.euiFormBackgroundDisabledColor} !important`,
    };

    return {
      processTree,
      detailPanel,
      nonGrowGroup,
      resizeHandle,
      searchBar,
      buttonsEyeDetail,
      sessionViewerComponent,
      toolBar,
    };
  }, [euiTheme, isFullScreen, height]);

  return cached;
};
