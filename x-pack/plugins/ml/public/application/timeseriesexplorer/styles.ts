/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { transparentize } from '@elastic/eui';
import { mlColors } from '../styles';

// Annotations constants
const mlAnnotationBorderWidth = '2px';
const mlAnnotationRectDefaultStrokeOpacity = 0.2;
const mlAnnotationRectDefaultFillOpacity = 0.05;

export const getTimeseriesExplorerStyles = () =>
  css({
    color: euiThemeVars.euiColorDarkShade,

    '.ml-timeseries-chart': {
      svg: {
        fontSize: euiThemeVars.euiFontSizeXS,
        fontFamily: euiThemeVars.euiFontFamily,
      },

      '.axis': {
        'path, line': {
          fill: 'none',
          stroke: euiThemeVars.euiBorderColor,
          shapeRendering: 'crispEdges',
          pointerEvents: 'none',
        },

        text: {
          fill: euiThemeVars.euiTextColor,
        },

        '.tick line': {
          stroke: euiThemeVars.euiColorLightShade,
        },
      },

      '.chart-border': {
        stroke: euiThemeVars.euiBorderColor,
        fill: 'none',
        strokeWidth: 1,
        shapeRendering: 'crispEdges',
      },

      '.chart-border-highlight': {
        stroke: euiThemeVars.euiColorDarkShade,
        strokeWidth: 2,

        '&:hover': {
          opacity: 1,
        },
      },

      '.area': {
        strokeWidth: 1,

        '&.bounds': {
          fill: transparentize(euiThemeVars.euiColorPrimary, 0.2),
          pointerEvents: 'none',
        },

        '&.forecast': {
          fill: transparentize(euiThemeVars.euiColorVis5, 0.3),
          pointerEvents: 'none',
        },
      },

      '.values-line': {
        fill: 'none',
        stroke: euiThemeVars.euiColorPrimary,
        strokeWidth: 2,
        pointerEvents: 'none',

        '&.forecast': {
          stroke: euiThemeVars.euiColorVis5,
          pointerEvents: 'none',
        },
      },

      '.hidden': {
        visibility: 'hidden',
      },

      '.values-dots circle': {
        fill: euiThemeVars.euiColorPrimary,
        strokeWidth: 0,
      },

      '.metric-value': {
        opacity: 1,
        fill: 'transparent',
        stroke: euiThemeVars.euiColorPrimary,
        strokeWidth: 0,
      },

      '.anomaly-marker': {
        strokeWidth: 1,
        stroke: euiThemeVars.euiColorMediumShade,

        '&.critical': {
          fill: mlColors.critical,
        },

        '&.major': {
          fill: mlColors.major,
        },

        '&.minor': {
          fill: mlColors.minor,
        },

        '&.warning': {
          fill: mlColors.warning,
        },

        '&.low': {
          fill: mlColors.lowWarning,
        },
      },

      '.metric-value:hover, .anomaly-marker:hover, .anomaly-marker.highlighted': {
        strokeWidth: 6,
        strokeOpacity: 0.65,
        stroke: euiThemeVars.euiColorPrimary,
      },

      'rect.scheduled-event-marker': {
        strokeWidth: 1,
        stroke: euiThemeVars.euiColorDarkShade,
        fill: euiThemeVars.euiColorLightShade,
      },

      '.forecast': {
        '.metric-value, .metric-value:hover': {
          stroke: euiThemeVars.euiColorVis5,
        },
      },

      '.focus-chart': {
        '.x-axis-background': {
          line: {
            fill: 'none',
            shapeRendering: 'crispEdges',
            stroke: euiThemeVars.euiColorLightestShade,
          },
          rect: {
            fill: euiThemeVars.euiColorLightestShade,
          },
        },
        '.focus-zoom': {
          fill: euiThemeVars.euiColorDarkShade,
          a: {
            text: {
              fill: euiThemeVars.euiColorPrimary,
              cursor: 'pointer',
            },
            '&:hover, &:active, &:focus': {
              textDecoration: 'underline',
              fill: euiThemeVars.euiColorPrimary,
            },
          },
        },
      },

      '.context-chart': {
        '.x.axis path': {
          display: 'none',
        },
        '.axis text': {
          fontSize: '10px',
          fill: euiThemeVars.euiTextColor,
        },
        '.values-line': {
          strokeWidth: 1,
        },
        '.mask': {
          polygon: {
            fillOpacity: 0.1,
          },
          '.area.bounds': {
            fill: euiThemeVars.euiColorLightShade,
          },
          '.values-line': {
            strokeWidth: 1,
            stroke: euiThemeVars.euiColorMediumShade,
          },
        },
      },

      '.swimlane .axis text': {
        display: 'none',
      },

      '.swimlane rect.swimlane-cell-hidden': {
        display: 'none',
      },

      '.brush .extent': {
        fillOpacity: 0,
        shapeRendering: 'crispEdges',
        stroke: euiThemeVars.euiColorDarkShade,
        strokeWidth: 2,
        cursor: 'move',
        '&:hover': {
          opacity: 1,
        },
      },

      '.top-border': {
        fill: euiThemeVars.euiColorEmptyShade,
      },

      'foreignObject.brush-handle': {
        pointerEvents: 'none',
        paddingTop: '1px',
      },

      'div.brush-handle-inner': {
        border: `1px solid ${euiThemeVars.euiColorDarkShade}`,
        backgroundColor: euiThemeVars.euiColorLightShade,
        height: '70px',
        width: '10px',
        textAlign: 'center',
        cursor: 'ew-resize',
        marginTop: '9px',
        fontSize: euiThemeVars.euiFontSizeS,
        fill: euiThemeVars.euiColorDarkShade,
      },

      'div.brush-handle-inner-left': {
        borderRadius: `${euiThemeVars.euiBorderRadius} 0 0 ${euiThemeVars.euiBorderRadius}`,
      },

      'div.brush-handle-inner-right': {
        borderRadius: `0 ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0`,
      },

      'rect.brush-handle': {
        strokeWidth: 1,
        stroke: euiThemeVars.euiColorDarkShade,
        fill: euiThemeVars.euiColorLightShade,
        pointerEvents: 'none',
        '&:hover': {
          opacity: 1,
        },
      },
    },
  });

export const getAnnotationStyles = () =>
  css({
    '.ml-annotation': {
      '&__brush': {
        '.extent': {
          stroke: euiThemeVars.euiColorLightShade,
          strokeWidth: mlAnnotationBorderWidth,
          strokeDasharray: '2 2',
          fill: euiThemeVars.euiColorLightestShade,
          shapeRendering: 'geometricPrecision',
        },
      },

      '&__rect': {
        stroke: euiThemeVars.euiColorFullShade,
        strokeWidth: mlAnnotationBorderWidth,
        strokeOpacity: mlAnnotationRectDefaultStrokeOpacity,
        fill: euiThemeVars.euiColorFullShade,
        fillOpacity: mlAnnotationRectDefaultFillOpacity,
        shapeRendering: 'geometricPrecision',
        transition: `stroke-opacity ${euiThemeVars.euiAnimSpeedFast}, fill-opacity ${euiThemeVars.euiAnimSpeedFast}`,

        '&--highlight': {
          strokeOpacity: mlAnnotationRectDefaultStrokeOpacity * 2,
          fillOpacity: mlAnnotationRectDefaultFillOpacity * 2,
        },

        '&--blur': {
          strokeOpacity: mlAnnotationRectDefaultStrokeOpacity / 2,
          fillOpacity: mlAnnotationRectDefaultFillOpacity / 2,
        },
      },

      '&__text': {
        textAnchor: 'middle',
        fontSize: euiThemeVars.euiFontSizeXS,
        fontFamily: euiThemeVars.euiFontFamily,
        fontWeight: euiThemeVars.euiFontWeightMedium,
        fill: euiThemeVars.euiColorFullShade,
        transition: `fill ${euiThemeVars.euiAnimSpeedFast}`,
        userSelect: 'none',

        '&--blur': {
          fill: euiThemeVars.euiColorMediumShade,
        },
      },

      '&__text-rect': {
        fill: euiThemeVars.euiColorLightShade,
        transition: `fill ${euiThemeVars.euiAnimSpeedFast}`,

        '&--blur': {
          fill: euiThemeVars.euiColorLightestShade,
        },
      },

      '&--hidden': {
        display: 'none',
      },

      '&__context-rect': {
        stroke: euiThemeVars.euiColorFullShade,
        strokeWidth: mlAnnotationBorderWidth,
        strokeOpacity: mlAnnotationRectDefaultStrokeOpacity,
        fill: euiThemeVars.euiColorFullShade,
        fillOpacity: mlAnnotationRectDefaultFillOpacity,
        transition: `stroke-opacity ${euiThemeVars.euiAnimSpeedFast}, fill-opacity ${euiThemeVars.euiAnimSpeedFast}`,
        shapeRendering: 'geometricPrecision',

        '&--blur': {
          strokeOpacity: mlAnnotationRectDefaultStrokeOpacity / 2,
          fillOpacity: mlAnnotationRectDefaultFillOpacity / 2,
        },
      },
    },
  });
