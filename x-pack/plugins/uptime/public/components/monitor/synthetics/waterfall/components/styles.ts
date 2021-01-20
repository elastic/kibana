/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { rgba } from 'polished';
import { euiStyled } from '../../../../../../../observability/public';
import { FIXED_AXIS_HEIGHT } from './constants';

interface WaterfallChartOuterContainerProps {
  height?: string;
}

export const WaterfallChartOuterContainer = euiStyled.div<WaterfallChartOuterContainerProps>`
  height: ${(props) => (props.height ? `${props.height}` : 'auto')};
  overflow-y: ${(props) => (props.height ? 'scroll' : 'visible')};
  overflow-x: hidden;
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

export const WaterfallChartFixedTopContainer = euiStyled.div`
  position: sticky;
  top: 0;
  z-index: ${(props) => props.theme.eui.euiZLevel4};
  border-bottom: ${(props) => `1px solid ${props.theme.eui.euiColorLightShade}`};
`;

export const WaterfallChartFixedTopContainerSidebarCover = euiStyled(EuiPanel)`
  height: 100%;
  border-radius: 0 !important;
  border: none;
`; // NOTE: border-radius !important is here as the "border" prop isn't working

export const WaterfallChartFixedAxisContainer = euiStyled.div`
  height: ${FIXED_AXIS_HEIGHT}px;
  z-index: ${(props) => props.theme.eui.euiZLevel4};
`;

interface WaterfallChartSidebarContainer {
  height: number;
}

export const WaterfallChartSidebarContainer = euiStyled.div<WaterfallChartSidebarContainer>`
  height: ${(props) => `${props.height}px`};
  overflow-y: hidden;
`;

export const WaterfallChartSidebarContainerInnerPanel = euiStyled(EuiPanel)`
  border: 0;
  height: 100%;
`;

export const WaterfallChartSidebarContainerFlexGroup = euiStyled(EuiFlexGroup)`
  height: 100%;
`;

// Ensures flex items honour no-wrap of children, rather than trying to extend to the full width of children.
export const WaterfallChartSidebarFlexItem = euiStyled(EuiFlexItem)`
  min-width: 0;
  padding-left: ${(props) => props.theme.eui.paddingSizes.m};
  padding-right: ${(props) => props.theme.eui.paddingSizes.m};
`;

interface WaterfallChartChartContainer {
  height: number;
  chartIndex: number;
}

export const WaterfallChartChartContainer = euiStyled.div<WaterfallChartChartContainer>`
  width: 100%;
  height: ${(props) => `${props.height + FIXED_AXIS_HEIGHT - 4}px`};
  margin-top: -${FIXED_AXIS_HEIGHT - 4}px;
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

export const WaterfallChartTooltip = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiColorDarkestShade};
  border-radius: ${(props) => props.theme.eui.euiBorderRadius};
  color: ${(props) => props.theme.eui.euiColorLightestShade};
  padding: ${(props) => props.theme.eui.paddingSizes.s};
`;
