/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TopLevelSpec } from 'vega-lite';

export type LegendType = 'nominal' | 'quantitative';

const getColorSpec = (outliers = true, color?: string, legendType?: LegendType) => {
  if (outliers) {
    return {
      condition: {
        value: '#bd271e',
        test: "(datum['outlier_score'] >= mlOutlierScoreThreshold.cutoff)",
      },
      value: 'gray',
    };
  }

  if (color !== undefined && legendType !== undefined) {
    return { field: color, type: legendType };
  }

  return { value: '#369' };
};

export const getScatterplotMatrixVegaLiteSpec = (
  values: any[],
  columns: string[],
  outliers = true,
  color?: string,
  legendType?: LegendType,
  dynamicSize?: boolean
): TopLevelSpec => {
  const transform = columns.map((column) => ({
    calculate: `datum['${column}']`,
    as: column,
  }));
  transform.push({
    calculate: `datum['ml.outlier_score']`,
    as: 'outlier_score',
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
      mark: 'point',
      encoding: {
        color: getColorSpec(outliers, color, legendType),
        opacity: {
          ...(outliers
            ? {
                condition: {
                  value: 0.75,
                  test: "(datum['outlier_score'] >= mlOutlierScoreThreshold.cutoff)",
                },
                value: 0.25,
              }
            : { value: 0.9 }),
        },
        size: {
          ...(outliers && dynamicSize
            ? {
                type: 'quantitative',
                field: 'outlier_score',
                scale: {
                  type: 'linear',
                  range: [2, 100],
                  domain: [0, 1],
                },
              }
            : { value: 2 }),
        },
        tooltip: { type: 'quantitative', field: 'outlier_score' },
        x: { type: 'quantitative', field: { repeat: 'column' } },
        y: { type: 'quantitative', field: { repeat: 'row' } },
        ...(outliers
          ? {
              order: { field: 'outlier_score' },
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
                  name: 'Outlier score threshold:',
                  step: 0.01,
                },
                init: { cutoff: 0.99 },
              },
            },
          }
        : {}),
      transform,
      width: 125,
      height: 125,
    },
  };
};
