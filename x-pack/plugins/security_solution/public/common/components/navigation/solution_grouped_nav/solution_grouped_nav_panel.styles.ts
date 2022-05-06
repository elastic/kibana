/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';

export const groupedNavPanelStyles = (
  euiTheme: EuiThemeComputed<{}>,
  isTimelineVisible: boolean
) => ({
  panel: `
    position: fixed;
    top: 95px;
    left: 247px;
    bottom: 0;
    width: 340px;
    height: inherit;

    box-shadow-bottom: none;

    // If the bottom bar is visible add padding to the navigation
    ${
      isTimelineVisible &&
      `
        height: inherit;
        bottom: 51px;
        box-shadow: 
          // left
          -${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%), 
          // right
          ${euiTheme.size.s} 0 ${euiTheme.size.s} -${euiTheme.size.s} rgb(0 0 0 / 15%), 
          // bottom inset to match timeline bar top shadow
          inset 0 -${euiTheme.size.xs} ${euiTheme.size.xs} -${euiTheme.size.xs} rgb(0 0 0 / 6%); 
      `
    }
  `,
});
