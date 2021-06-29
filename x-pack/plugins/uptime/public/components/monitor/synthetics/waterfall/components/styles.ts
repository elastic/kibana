/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionComponent } from 'react';
import { StyledComponent } from 'styled-components';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiPanelProps } from '@elastic/eui';
import { rgba } from 'polished';
import { FIXED_AXIS_HEIGHT } from './constants';
import { euiStyled, EuiTheme } from '../../../../../../../../../src/plugins/kibana_react/common';

interface WaterfallChartOuterContainerProps {
  height?: string;
}

const StyledScrollDiv = euiStyled.div`
  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }
  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }
  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

export const WaterfallChartOuterContainer = euiStyled(
  StyledScrollDiv
)<WaterfallChartOuterContainerProps>`
  height: ${(props) => (props.height ? `${props.height}` : 'auto')};
  overflow-y: ${(props) => (props.height ? 'scroll' : 'visible')};
  overflow-x: hidden;
`;

export const WaterfallChartFixedTopContainer = euiStyled(StyledScrollDiv)`
  position: sticky;
  top: 0;
  z-index: ${(props) => props.theme.eui.euiZLevel4};
  overflow-y: scroll;
  overflow-x: hidden;
`;

export const WaterfallChartAxisOnlyContainer = euiStyled(EuiFlexItem)`
  margin-left: -16px;
`;

export const WaterfallChartTopContainer = euiStyled(EuiFlexGroup)`
`;

export const WaterfallChartFixedTopContainerSidebarCover: StyledComponent<
  FunctionComponent<EuiPanelProps>,
  EuiTheme
> = euiStyled(EuiPanel)`
  height: 100%;
  border-radius: 0 !important;
  border: none;
`; // NOTE: border-radius !important is here as the "border" prop isn't working

export const WaterfallChartFilterContainer = euiStyled.div`
  && {
    padding: 16px;
    z-index: ${(props) => props.theme.eui.euiZLevel5};
    border-bottom: 0.3px solid ${(props) => props.theme.eui.euiColorLightShade};
  }
`; // NOTE: border-radius !important is here as the "border" prop isn't working

export const WaterfallChartFixedAxisContainer = euiStyled.div`
  height: ${FIXED_AXIS_HEIGHT}px;
  z-index: ${(props) => props.theme.eui.euiZLevel4};
  height: 100%;
  &&& {
    .echAnnotation__icon {
      top: 8px;
    }
  }
`;

interface WaterfallChartSidebarContainer {
  height: number;
}

export const WaterfallChartSidebarWrapper = euiStyled(EuiFlexItem)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
  min-width: 0;
`; // NOTE: min-width: 0 ensures flexbox and no-wrap children can co-exist

export const WaterfallChartSidebarContainer = euiStyled.div<WaterfallChartSidebarContainer>`
  height: ${(props) => `${props.height}px`};
  overflow-y: hidden;
  overflow-x: hidden;
`;

export const WaterfallChartSidebarContainerInnerPanel: StyledComponent<
  FunctionComponent<EuiPanelProps>,
  EuiTheme
> = euiStyled(EuiPanel)`
  border: 0;
  height: 100%;
`;

export const WaterfallChartSidebarContainerFlexGroup = euiStyled(EuiFlexGroup)`
  height: 100%;
`;

// Ensures flex items honour no-wrap of children, rather than trying to extend to the full width of children.
export const WaterfallChartSidebarFlexItem = euiStyled(EuiFlexItem)`
  min-width: 0;
  padding-right: ${(props) => props.theme.eui.paddingSizes.s};
  justify-content: space-around;
`;

export const SideBarItemHighlighter = euiStyled(EuiFlexItem)<{ isHighlighted: boolean }>`
  opacity: ${(props) => (props.isHighlighted ? 1 : 0.4)};
  height: 100%;
  .euiButtonEmpty {
    height: ${FIXED_AXIS_HEIGHT}px;
    font-size:${({ theme }) => theme.eui.euiFontSizeM};
  }
`;

interface WaterfallChartChartContainer {
  height: number;
  chartIndex: number;
}

export const WaterfallChartChartContainer = euiStyled.div<WaterfallChartChartContainer>`
  width: 100%;
  height: ${(props) => `${props.height + FIXED_AXIS_HEIGHT + 4}px`};
  margin-top: -${FIXED_AXIS_HEIGHT + 4}px;
  z-index: ${(props) => Math.round(props.theme.eui.euiZLevel3 / (props.chartIndex + 1))};
`;

export const WaterfallChartLegendContainer = euiStyled.div`
  position: sticky;
  bottom: 0;
  z-index: ${(props) => props.theme.eui.euiZLevel4};
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  padding: ${(props) => props.theme.eui.paddingSizes.xs};
  font-size: ${(props) => props.theme.eui.euiFontSizeXS};
  box-shadow: 0px -1px 4px 0px ${(props) => props.theme.eui.euiColorLightShade};
`; // NOTE: EuiShadowColor is a little too dark to work with the background-color

export const WaterfallTooltipResponsiveMaxWidth = euiStyled.div`
  margin-top: 16px;
  max-width: 90vw;
`;

export const WaterfallChartTooltip = euiStyled(WaterfallTooltipResponsiveMaxWidth)`
  background-color: ${(props) => props.theme.eui.euiColorDarkestShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${(props) => props.theme.eui.euiColorLightestShade};
  padding: ${(props) => props.theme.eui.paddingSizes.s};
  .euiToolTip__arrow {
    background-color: ${(props) => props.theme.eui.euiColorDarkestShade};
  }
`;

export const NetworkRequestsTotalStyle = euiStyled(EuiText)`
  line-height: 28px;
  padding: 0 ${(props) => props.theme.eui.paddingSizes.m};
  border-bottom: 0.3px solid ${(props) => props.theme.eui.euiColorLightShade};
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

export const RelativeContainer = euiStyled.div`
    position: relative;
`;
