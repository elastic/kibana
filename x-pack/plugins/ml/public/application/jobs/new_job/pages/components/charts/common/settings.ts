/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeBuckets } from '@kbn/ml-time-buckets';
import { useCurrentThemeVars } from '../../../../../../contexts/kibana';
import type { JobCreatorType } from '../../../../common/job_creator';
import { isMultiMetricJobCreator, isPopulationJobCreator } from '../../../../common/job_creator';
import { getTimeBucketsFromCache } from '../../../../../../util/get_time_buckets_from_cache';

export function useChartColors() {
  const { euiTheme } = useCurrentThemeVars();
  return {
    LINE_COLOR: euiTheme.euiColorPrimary,
    MODEL_COLOR: euiTheme.euiColorPrimary,
    EVENT_RATE_COLOR: euiTheme.euiColorPrimary,
    EVENT_RATE_COLOR_WITH_ANOMALIES: euiTheme.euiColorLightShade,
  };
}

export interface ChartSettings {
  width: string;
  height: string;
  cols: 1 | 2 | 3;
  intervalMs: number;
}

export const defaultChartSettings: ChartSettings = {
  width: '100%',
  height: '300px',
  cols: 1,
  intervalMs: 0,
};

export const seriesStyle = {
  line: {
    strokeWidth: 2,
    visible: true,
    opacity: 1,
  },
  border: {
    visible: false,
    strokeWidth: 0,
  },
  point: {
    visible: false,
    radius: 2,
    strokeWidth: 4,
    opacity: 0.5,
  },
  area: {
    opacity: 0.25,
    visible: false,
  },
};

export function getChartSettings(jobCreator: JobCreatorType, chartInterval: TimeBuckets) {
  const cs = {
    ...defaultChartSettings,
    intervalMs: chartInterval.getInterval().asMilliseconds(),
  };

  if (isPopulationJobCreator(jobCreator)) {
    // for population charts, use a larger interval based on
    // the calculation from TimeBuckets, but without the
    // bar target and max bars which have been set for the
    // general chartInterval
    const interval = getTimeBucketsFromCache();
    interval.setInterval('auto');
    interval.setBounds(chartInterval.getBounds());
    cs.intervalMs = interval.getInterval().asMilliseconds();
  }

  if (cs.intervalMs < jobCreator.bucketSpanMs) {
    // don't allow the chart interval to be smaller than the bucket span
    cs.intervalMs = jobCreator.bucketSpanMs;
  }

  if (isMultiMetricJobCreator(jobCreator) || isPopulationJobCreator(jobCreator)) {
    if (jobCreator.aggFieldPairs.length > 2 && isMultiMetricJobCreator(jobCreator)) {
      cs.cols = 3;
      cs.height = '150px';
      cs.intervalMs = cs.intervalMs * 3;
    } else if (jobCreator.aggFieldPairs.length > 1) {
      cs.cols = 2;
      cs.height = '200px';
      cs.intervalMs = cs.intervalMs * 2;
    }
  }

  return cs;
}
