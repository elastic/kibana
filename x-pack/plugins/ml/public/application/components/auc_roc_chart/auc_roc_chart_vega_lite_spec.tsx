/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build-es5/vega-lite';

import { euiPaletteColorBlind, euiPaletteGray } from '@elastic/eui';

import { AucRocCurveItem } from '../../data_frame_analytics/common/analytics';

export const LEGEND_TYPES = {
  NOMINAL: 'nominal',
  QUANTITATIVE: 'quantitative',
} as const;
export type LegendType = typeof LEGEND_TYPES[keyof typeof LEGEND_TYPES];

const BASELINE = 'baseline';

// returns a custom color range that includes gray for the baseline
function getColorRangeNominal(classificationClasses: string[]) {
  const legendItems = [...classificationClasses, BASELINE].sort();
  const baselineIndex = legendItems.indexOf(BASELINE);

  const colorRangeNominal = euiPaletteColorBlind({ rotations: 2 }).slice(
    0,
    classificationClasses.length
  );

  colorRangeNominal.splice(baselineIndex, 0, euiPaletteGray(1)[0]);

  return colorRangeNominal;
}

export interface AucRocDataRow extends AucRocCurveItem {
  class_name: string;
}

export const getAucRocChartVegaLiteSpec = (
  classificationClasses: string[],
  data: AucRocDataRow[]
): TopLevelSpec => {
  // we append two rows which make up the data for the diagonal baseline
  data.push({ tpr: 0, fpr: 0, threshold: 1, class_name: BASELINE });
  data.push({ tpr: 1, fpr: 1, threshold: 1, class_name: BASELINE });

  const colorRangeNominal = getColorRangeNominal(classificationClasses);

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
        type: LEGEND_TYPES.NOMINAL,
        scale: {
          range: colorRangeNominal,
        },
      },
      size: {
        value: 2,
      },
      strokeDash: {
        condition: {
          test: `(datum.class_name === '${BASELINE}')`,
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
      tooltip: [
        { type: LEGEND_TYPES.NOMINAL, field: 'class_name' },
        { type: LEGEND_TYPES.QUANTITATIVE, field: 'fpr' },
        { type: LEGEND_TYPES.QUANTITATIVE, field: 'tpr' },
      ],
    },
    height: 400,
    width: 400,
    mark: 'line',
    title: 'ROC Curve',
  };
};
