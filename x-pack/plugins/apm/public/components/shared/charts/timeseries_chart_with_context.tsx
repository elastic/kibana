/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LegendItemListener,
  PartialTheme,
  YDomainRange,
} from '@elastic/charts';
import React from 'react';
import { ApmMlJobResultWithTimeseries } from '../../../../common/anomaly_detection/apm_ml_job_result';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useDeploymentAnnotations } from '../../../hooks/use_deployment_annotations';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTimeZone } from '../../../hooks/use_time_zone';
import { unit } from '../../../utils/style';
import { TimeseriesChart } from './timeseries_chart';

interface ColoredAnomalyTimeseries extends ApmMlJobResultWithTimeseries {
  color?: string;
}

export interface TimeseriesChartWithContextProps {
  id: string;
  fetchStatus: FETCH_STATUS;
  height?: number;
  onToggleLegend?: LegendItemListener;
  timeseries: Array<TimeSeries<Coordinate>>;
  /**
   * Formatter for y-axis tick values
   */
  yLabelFormat: (y: number) => string;
  /**
   * Formatter for legend and tooltip values
   */
  yTickFormat?: (y: number) => string;
  showAnnotations?: boolean;
  yDomain?: YDomainRange;
  anomalyTimeseries?: ColoredAnomalyTimeseries;
  customTheme?: PartialTheme;
  hideXAxis?: boolean;
  hideYAxis?: boolean;
  hideLegend?: boolean;
}

export function TimeseriesChartWithContext({
  id,
  height = unit * 16,
  fetchStatus,
  onToggleLegend,
  timeseries,
  yLabelFormat,
  yTickFormat,
  showAnnotations = true,
  yDomain,
  anomalyTimeseries,
  customTheme = {},
  hideXAxis,
  hideYAxis,
}: TimeseriesChartWithContextProps) {
  const {
    query: { comparisonEnabled, offset },
  } = useAnyOfApmParams(
    '/services',
    '/dependencies/*',
    '/services/{serviceName}'
  );

  const timeZone = useTimeZone();

  const timeseriesAnnotations = useDeploymentAnnotations();

  return (
    <TimeseriesChart
      id={id}
      height={height}
      fetchStatus={fetchStatus}
      onToggleLegend={onToggleLegend}
      timeseries={timeseries}
      yLabelFormat={yLabelFormat}
      yTickFormat={yTickFormat}
      showAnnotations={showAnnotations}
      annotations={timeseriesAnnotations}
      yDomain={yDomain}
      anomalyTimeseries={anomalyTimeseries}
      customTheme={customTheme}
      timeZone={timeZone}
      comparisonEnabled={comparisonEnabled}
      offset={offset}
      hideXAxis={hideXAxis}
      hideYAxis={hideYAxis}
    />
  );
}
