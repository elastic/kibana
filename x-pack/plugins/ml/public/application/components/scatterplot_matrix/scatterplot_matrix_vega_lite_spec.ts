/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build-es5/vega-lite';

import { euiPaletteColorBlind, euiPalettePositive } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export const LEGEND_TYPES = {
  NOMINAL: 'nominal',
  QUANTITATIVE: 'quantitative',
} as const;
export type LegendType = typeof LEGEND_TYPES[keyof typeof LEGEND_TYPES];

export const OUTLIER_SCORE_FIELD = 'outlier_score';

const SCATTERPLOT_SIZE = 125;

const DEFAULT_COLOR = euiPaletteColorBlind()[0];
const COLOR_RANGE_NOMINAL = euiPaletteColorBlind({ rotations: 2 });
const COLOR_RANGE_QUANTITATIVE = euiPalettePositive(5);

const getColorSpec = (outliers = true, color?: string, legendType?: LegendType) => {
  if (outliers) {
    return {
      condition: {
        value: '#bd271e',
        test: `(datum['${OUTLIER_SCORE_FIELD}'] >= mlOutlierScoreThreshold.cutoff)`,
      },
      value: 'gray',
    };
  }

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
  transform.push({
    calculate: `datum['${resultsField}.${OUTLIER_SCORE_FIELD}']`,
    as: OUTLIER_SCORE_FIELD,
  });

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.8.1.json',
    padding: 10,
    config: {
      axis: {
        domainColor: '#ccc',
        tickColor: '#ccc',
        labelColor: '#aaa',
        titleColor: '#999',
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
        color: getColorSpec(outliers, color, legendType),
        ...(dynamicSize
          ? {
              stroke: getColorSpec(outliers, color, legendType),
              opacity: {
                condition: {
                  value: 1,
                  test: `(datum['${OUTLIER_SCORE_FIELD}'] >= mlOutlierScoreThreshold.cutoff)`,
                },
                value: 0.25,
              },
            }
          : {}),
        ...(outliers
          ? {
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
        tooltip: { type: LEGEND_TYPES.QUANTITATIVE, field: OUTLIER_SCORE_FIELD },
        x: { type: LEGEND_TYPES.QUANTITATIVE, field: { repeat: 'column' } },
        y: { type: LEGEND_TYPES.QUANTITATIVE, field: { repeat: 'row' } },
        ...(outliers
          ? {
              order: { field: OUTLIER_SCORE_FIELD },
            }
          : {}),
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
