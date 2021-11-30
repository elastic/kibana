/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

export const sidebarPanelClassName = 'canvasSidebar__panel';
export const sidebarAccordionClassName = 'canvasSidebar__accordion';
export const sidebarExpandableClassName = 'canvasSidebar__expandable';
export const sidebarFiltersClassName = 'filtersSidebar__accordion';

export const sidebarAccordionStylesFactory = (theme: EuiThemeComputed) => css`
  padding: ${theme.size.m};
  margin: 0 -${theme.size.m};
  background: ${theme.colors.lightestShade};
  position: relative;

  &.euiAccordion-isOpen {
    background: transparent;
  }

  &.${sidebarFiltersClassName} {
    margin: auto;
  }

  .${sidebarPanelClassName} .${sidebarExpandableClassName}:last-child & {
    margin-bottom: -${theme.size.s};

    &:after {
      content: none;
    }

    &.euiAccordion-isOpen:after {
      display: none;
    }
  }

  &:before,
  &:after {
    content: '';
    height: 1px;
    position: absolute;
    left: 0;
    width: 100%;
    background: ${theme.colors.lightShade};
  }

  &:before {
    top: 0;

    .${sidebarExpandableClassName} + .${sidebarExpandableClassName} & {
      display: none;
    }
  }

  &:after {
    bottom: 0;
  }
`;

export const sidebarExpandableStyles = css`
  width: 100%;
  + .${sidebarExpandableClassName} {
    margin-top: 0px;
  }
`;

export const sidebarPanelStylesFactory = (theme: EuiThemeComputed) => css`
  border-bottom: ${theme.border.thin};
  padding: ${theme.size.s} ${theme.size.m};

  &.${sidebarPanelClassName}--isEmpty {
    border-bottom: none;
  }
`;
