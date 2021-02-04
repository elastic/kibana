/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build-es5/vega-lite';

import euiThemeLight from '@elastic/eui/dist/eui_theme_light.json';

import { euiPaletteColorBlind, euiPaletteNegative, euiPalettePositive } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const LEGEND_TYPES = {
  NOMINAL: 'nominal',
  QUANTITATIVE: 'quantitative',
} as const;
export type LegendType = typeof LEGEND_TYPES[keyof typeof LEGEND_TYPES];

export const OUTLIER_SCORE_FIELD = 'outlier_score';

const SCATTERPLOT_SIZE = 125;

export const DEFAULT_COLOR = euiPaletteColorBlind()[0];
export const COLOR_OUTLIER = euiPaletteNegative(2)[1];
export const COLOR_RANGE_NOMINAL = euiPaletteColorBlind({ rotations: 2 });
export const COLOR_RANGE_QUANTITATIVE = euiPalettePositive(5);

export const getColorSpec = (
  euiTheme: typeof euiThemeLight,
  outliers = true,
  color?: string,
  legendType?: LegendType
) => {
  // For outlier detection result pages coloring is done based on a threshold.
  // This returns a Vega spec using a conditional to return the color.
  if (outliers) {
    return {
      condition: {
        value: COLOR_OUTLIER,
        test: `(datum['${OUTLIER_SCORE_FIELD}'] >= mlOutlierScoreThreshold.cutoff)`,
      },
      value: euiTheme.euiColorMediumShade,
    };
  }

  // Based on the type of the color field,
  // this returns either a continuous or categorical color spec.
  if (color !== undefined && legendType !== undefined) {
    return {
      field: color,
      type: legendType,
      scale: {
        range: legendType === LEGEND_TYPES.NOMINAL ? COLOR_RANGE_NOMINAL : COLOR_RANGE_QUANTITATIVE,
      },
    };
  }

  return { value: DEFAULT_COLOR };
};

export const getScatterplotMatrixVegaLiteSpec = (
  values: any[],
  columns: string[],
  euiTheme: typeof euiThemeLight,
  resultsField?: string,
  color?: string,
  legendType?: LegendType,
  dynamicSize?: boolean
): TopLevelSpec => {
  const outliers = resultsField !== undefined;
  const transform = columns.map((column) => ({
    calculate: `datum['${column}']`,
    as: column,
  }));

  if (resultsField !== undefined) {
    transform.push({
      calculate: `datum['${resultsField}.${OUTLIER_SCORE_FIELD}']`,
      as: OUTLIER_SCORE_FIELD,
    });
  }

  const colorSpec = getColorSpec(euiTheme, outliers, color, legendType);

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.17.0.json',
    background: 'transparent',
    // There seems to be a bug in Vega which doesn't propagate these settings
    // for repeated charts, it seems to be fixed for facets but not repeat.
    // This causes #ddd lines to stand out in dark mode.
    // See: https://github.com/vega/vega-lite/issues/5908
    view: { fill: 'transparent', stroke: euiTheme.euiColorLightestShade },
    padding: 10,
    config: {
      axis: {
        domainColor: euiTheme.euiColorLightShade,
        gridColor: euiTheme.euiColorLightestShade,
        tickColor: euiTheme.euiColorLightestShade,
        labelColor: euiTheme.euiTextSubduedColor,
        titleColor: euiTheme.euiTextSubduedColor,
      },
    },
    repeat: {
      column: columns,
      row: columns.slice().reverse(),
    },
    spec: {
      data: { values },
      mark: {
        ...(outliers && dynamicSize
          ? {
              type: 'circle',
              strokeWidth: 1.2,
              strokeOpacity: 0.75,
              fillOpacity: 0.1,
            }
          : { type: 'circle', opacity: 0.75, size: 8 }),
      },
      encoding: {
        color: colorSpec,
        ...(dynamicSize
          ? {
              stroke: colorSpec,
              opacity: {
                condition: {
                  value: 1,
                  test: `(datum['${OUTLIER_SCORE_FIELD}'] >= mlOutlierScoreThreshold.cutoff)`,
                },
                value: 0.5,
              },
            }
          : {}),
        ...(outliers
          ? {
              order: { field: OUTLIER_SCORE_FIELD },
              size: {
                ...(!dynamicSize
                  ? {
                      condition: {
                        value: 40,
                        test: `(datum['${OUTLIER_SCORE_FIELD}'] >= mlOutlierScoreThreshold.cutoff)`,
                      },
                      value: 8,
                    }
                  : {
                      type: LEGEND_TYPES.QUANTITATIVE,
                      field: OUTLIER_SCORE_FIELD,
                      scale: {
                        type: 'linear',
                        range: [8, 200],
                        domain: [0, 1],
                      },
                    }),
              },
            }
          : {}),
        x: {
          type: LEGEND_TYPES.QUANTITATIVE,
          field: { repeat: 'column' },
          scale: { zero: false },
        },
        y: {
          type: LEGEND_TYPES.QUANTITATIVE,
          field: { repeat: 'row' },
          scale: { zero: false },
        },
        tooltip: [
          ...(color !== undefined ? [{ type: colorSpec.type, field: color }] : []),
          ...columns.map((d) => ({ type: LEGEND_TYPES.QUANTITATIVE, field: d })),
          ...(outliers
            ? [{ type: LEGEND_TYPES.QUANTITATIVE, field: OUTLIER_SCORE_FIELD, format: '.3f' }]
            : []),
        ],
      },
      ...(outliers
        ? {
            selection: {
              mlOutlierScoreThreshold: {
                type: 'single',
                fields: ['cutoff'],
                bind: {
                  input: 'range',
                  max: 1,
                  min: 0,
                  name: i18n.translate('xpack.ml.splomSpec.outlierScoreThresholdName', {
                    defaultMessage: 'Outlier score threshold: ',
                  }),
                  step: 0.01,
                },
                init: { cutoff: 0.99 },
              },
            },
          }
        : {}),
      transform,
      width: SCATTERPLOT_SIZE,
      height: SCATTERPLOT_SIZE,
    },
  };
};
