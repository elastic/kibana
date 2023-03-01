/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ApmMlJobResultWithTimeseries } from '../../../../common/anomaly_detection/apm_ml_job_result';
import { Coordinate } from '../../../../typings/timeseries';
import { useDeploymentAnnotations } from '../../../hooks/use_deployment_annotations';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTimeZone } from '../../../hooks/use_time_zone';
import { unit } from '../../../utils/style';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';
import { TimeseriesChart } from '../charts/timeseries_chart';
import { TimeRangeComparisonEnum } from '../time_comparison/get_comparison_options';

interface Props {
  id: string;
  title: string;
  yLabelFormat: (y: number) => string;
  dataFetchStatus: FETCH_STATUS;
  data?: Coordinate[] | null;
  chartType: ChartType;
  anomalyTimeseries?: ApmMlJobResultWithTimeseries;
  compact?: boolean;
}

export function ServiceSummaryTimeseriesChart({
  yLabelFormat,
  title,
  chartType,
  id,
  dataFetchStatus,
  data,
  anomalyTimeseries,
  compact = false,
}: Props) {
  const timeseries = [
    {
      color: getTimeSeriesColor(chartType).currentPeriodColor,
      data: data ?? [],
      title,
      type: 'line' as const,
    },
  ];

  const timeZone = useTimeZone();

  const timeseriesAnnotations = useDeploymentAnnotations();

  return (
    <TimeseriesChart
      fetchStatus={dataFetchStatus}
      id={id}
      timeseries={timeseries}
      yLabelFormat={yLabelFormat}
      hideXAxis
      hideYAxis
      comparisonEnabled
      offset={TimeRangeComparisonEnum.ExpectedBounds}
      timeZone={timeZone}
      annotations={timeseriesAnnotations}
      anomalyTimeseries={
        anomalyTimeseries
          ? {
              ...anomalyTimeseries,
              color: getTimeSeriesColor(chartType).previousPeriodColor,
            }
          : undefined
      }
      hideLegend
      height={compact ? unit * 4 : unit * 6}
      customTheme={{
        chartMargins: {
          bottom: 0,
          left: 0,
          top: 0,
          right: 0,
        },
        chartPaddings: {
          bottom: 0,
          left: 0,
          top: 0,
          right: 0,
        },
      }}
    />
  );
}
