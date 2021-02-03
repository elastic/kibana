/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build-es5/vega-lite';

import { euiPaletteColorBlind, euiPaletteNegative, euiPalettePositive } from '@elastic/eui';

export const LEGEND_TYPES = {
  NOMINAL: 'nominal',
  QUANTITATIVE: 'quantitative',
} as const;
export type LegendType = typeof LEGEND_TYPES[keyof typeof LEGEND_TYPES];

export const OUTLIER_SCORE_FIELD = 'outlier_score';

export const DEFAULT_COLOR = euiPaletteColorBlind()[0];
export const COLOR_OUTLIER = euiPaletteNegative(2)[1];
export const COLOR_RANGE_NOMINAL = euiPaletteColorBlind({ rotations: 2 });
export const COLOR_RANGE_QUANTITATIVE = euiPalettePositive(5);

export const getAucRocChartVegaLiteSpec = (data: any[]): TopLevelSpec => {
  // we append two rows which make up the data for the diagonal baseline
  data.push({ tpr: 0, fpr: 0, threshold: 1, class_name: 'baseline' });
  data.push({ tpr: 1, fpr: 1, threshold: 1, class_name: 'baseline' });

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.8.1.json',
    config: {
      legend: {
        orient: 'right',
      },
      view: {
        continuousHeight: 300,
        continuousWidth: 400,
      },
    },
    data: {
      name: 'auc-roc-data',
    },
    datasets: {
      'auc-roc-data': data,
    },
    encoding: {
      color: {
        field: 'class_name',
        type: 'nominal',
        scale: {
          range: COLOR_RANGE_NOMINAL,
        },
      },
      size: {
        value: 2,
      },
      strokeDash: {
        condition: {
          test: "(datum.class_name === 'baseline')",
          value: [5, 5],
        },
        value: [0],
      },
      x: {
        field: 'fpr',
        sort: null,
        title: 'False Positive Rate (FPR)',
        type: 'quantitative',
      },
      y: {
        field: 'tpr',
        title: 'True Positive Rate (TPR) (a.k.a Recall)',
        type: 'quantitative',
      },
      tooltip: ['class_name', 'fpt', 'tpr'],
    },
    height: 400,
    width: 400,
    mark: 'line',
    title: 'ROC Curve',
  };
};
