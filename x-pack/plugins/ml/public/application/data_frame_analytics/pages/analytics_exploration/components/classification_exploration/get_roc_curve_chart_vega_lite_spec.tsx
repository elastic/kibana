/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// There is still an issue with Vega Lite's typings with the strict mode Kibana is using.
// @ts-ignore
import type { TopLevelSpec } from 'vega-lite/build/vega-lite';

import { euiPaletteColorBlind, euiPaletteGray } from '@elastic/eui';
import { euiLightVars as euiThemeLight } from '@kbn/ui-theme';

import { i18n } from '@kbn/i18n';

import { LEGEND_TYPES } from '../../../../../components/vega_chart/common';

import { RocCurveItem } from '../../../../common/analytics';

const GRAY = euiPaletteGray(1)[0];
const BASELINE = 'baseline';
const SIZE = 300;

// returns a custom color range that includes gray for the baseline
function getColorRangeNominal(classificationClasses: string[]) {
  const legendItems = [...classificationClasses, BASELINE].sort();
  const baselineIndex = legendItems.indexOf(BASELINE);

  const colorRangeNominal = euiPaletteColorBlind({ rotations: 2 }).slice(
    0,
    classificationClasses.length
  );

  colorRangeNominal.splice(baselineIndex, 0, GRAY);

  return colorRangeNominal;
}

export interface RocCurveDataRow extends RocCurveItem {
  class_name: string;
}

export const getRocCurveChartVegaLiteSpec = (
  classificationClasses: string[],
  data: RocCurveDataRow[],
  legendTitle: string,
  euiTheme: typeof euiThemeLight
): TopLevelSpec => {
  // we append two rows which make up the data for the diagonal baseline
  data.push({ tpr: 0, fpr: 0, threshold: 1, class_name: BASELINE });
  data.push({ tpr: 1, fpr: 1, threshold: 1, class_name: BASELINE });

  const colorRangeNominal = getColorRangeNominal(classificationClasses);

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.8.1.json',
    background: 'transparent',
    // Left padding of 45px to align the left axis of the chart with the confusion matrix above.
    padding: { left: 45, top: 0, right: 0, bottom: 0 },
    config: {
      legend: {
        orient: 'right',
        labelColor: euiTheme.euiTextSubduedColor,
        titleColor: euiTheme.euiTextSubduedColor,
      },
      view: {
        continuousHeight: SIZE,
        continuousWidth: SIZE,
      },
    },
    data: {
      name: 'roc-curve-data',
    },
    datasets: {
      'roc-curve-data': data,
    },
    encoding: {
      color: {
        field: 'class_name',
        type: LEGEND_TYPES.NOMINAL,
        scale: {
          range: colorRangeNominal,
        },
        legend: {
          title: legendTitle,
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
        title: i18n.translate('xpack.ml.dataframe.analytics.rocChartSpec.xAxisTitle', {
          defaultMessage: 'False Positive Rate (FPR)',
        }),
        type: 'quantitative',
        axis: {
          tickColor: GRAY,
          labelColor: euiTheme.euiTextSubduedColor,
          domainColor: GRAY,
          titleColor: euiTheme.euiTextSubduedColor,
        },
      },
      y: {
        field: 'tpr',
        title: i18n.translate('xpack.ml.dataframe.analytics.rocChartSpec.yAxisTitle', {
          defaultMessage: 'True Positive Rate (TPR) (a.k.a Recall)',
        }),
        type: 'quantitative',
        axis: {
          tickColor: GRAY,
          labelColor: euiTheme.euiTextSubduedColor,
          domainColor: GRAY,
          titleColor: euiTheme.euiTextSubduedColor,
        },
      },
      tooltip: [
        { type: LEGEND_TYPES.NOMINAL, field: 'class_name' },
        { type: LEGEND_TYPES.QUANTITATIVE, field: 'fpr' },
        { type: LEGEND_TYPES.QUANTITATIVE, field: 'tpr' },
      ],
    },
    height: SIZE,
    width: SIZE,
    mark: {
      type: 'line',
      strokeCap: 'round',
      strokeJoin: 'round',
    },
  };
};
