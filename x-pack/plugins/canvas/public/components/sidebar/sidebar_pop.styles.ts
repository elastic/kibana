/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';

export const sidebarPanelClassName = 'canvasSidebar__panel';
export const sidebarAccordionClassName = 'canvasSidebar__accordion';
export const sidebarExpandableClassName = 'canvasSidebar__expandable';
export const sidebarFiltersClassName = 'filtersSidebar__accordion';

const sidebarPopKeyFrames = keyframes`
 0% {
    opacity: 0;
  }

  1% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
`;

export const sidebarPopStylesFactory = (theme: EuiThemeComputed) => css`
  animation: ${sidebarPopKeyFrames} ${theme.animation.fast} ${theme.animation.resistance};
`;
