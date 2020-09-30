/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ScaleType } from '@elastic/charts';
import { EuiSelectOption } from '@elastic/eui';

import { histogramDateTimeFormatter } from '../../../../common/components/utils';
import { ChartSeriesConfigs } from '../../../../common/components/charts/common';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';

export const HITS_THRESHOLD: Record<string, number> = {
  h: 1,
  d: 24,
  M: 730,
};

export const getTimeframeOptions = (ruleType: Type): EuiSelectOption[] => {
  if (ruleType === 'eql') {
    return [
      { value: 'h', text: 'Last hour' },
      { value: 'd', text: 'Last day' },
    ];
  } else {
    return [
      { value: 'h', text: 'Last hour' },
      { value: 'd', text: 'Last day' },
      { value: 'M', text: 'Last month' },
    ];
  }
};

export const getHistogramConfig = (to: string, from: string): ChartSeriesConfigs => {
  return {
    series: {
      xScaleType: ScaleType.Time,
      yScaleType: ScaleType.Linear,
      stackAccessors: ['g'],
    },
    axis: {
      xTickFormatter: histogramDateTimeFormatter([to, from]),
      yTickFormatter: (value: string | number): string => value.toLocaleString(),
      tickSize: 8,
    },
    settings: {
      showLegend: false,
      theme: {
        scales: {
          barsPadding: 0.08,
        },
        chartMargins: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        chartPaddings: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    },
    customHeight: 200,
  };
};
