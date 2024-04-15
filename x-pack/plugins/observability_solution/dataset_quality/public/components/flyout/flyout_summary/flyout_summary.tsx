/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { OnRefreshProps, OnTimeChangeProps, EuiSpacer } from '@elastic/eui';

import { DegradedDocs } from '../degraded_docs_trend/degraded_docs';
import { DataStreamDetails } from '../../../../common/api_types';
import { DEFAULT_TIME_RANGE, DEFAULT_DATEPICKER_REFRESH } from '../../../../common/constants';
import { useDatasetQualityContext } from '../../dataset_quality/context';
import { FlyoutDataset, TimeRangeConfig } from '../../../state_machines/dataset_quality_controller';
import { FlyoutSummaryHeader } from './flyout_summary_header';
import { FlyoutSummaryKpis, FlyoutSummaryKpisLoading } from './flyout_summary_kpis';

export function FlyoutSummary({
  dataStream,
  dataStreamStat,
  dataStreamDetails,
  dataStreamDetailsLoading,
  timeRange = { ...DEFAULT_TIME_RANGE, refresh: DEFAULT_DATEPICKER_REFRESH },
}: {
  dataStream: string;
  dataStreamStat?: FlyoutDataset;
  dataStreamDetails?: DataStreamDetails;
  dataStreamDetailsLoading: boolean;
  timeRange?: TimeRangeConfig;
}) {
  const { service } = useDatasetQualityContext();
  const [lastReloadTime, setLastReloadTime] = useState<number>(Date.now());

  const updateTimeRange = useCallback(
    ({ start, end, refreshInterval }: OnRefreshProps) => {
      service.send({
        type: 'UPDATE_INSIGHTS_TIME_RANGE',
        timeRange: {
          from: start,
          to: end,
          refresh: { ...DEFAULT_DATEPICKER_REFRESH, value: refreshInterval },
        },
      });
    },
    [service]
  );

  const handleTimeChange = useCallback(
    ({ isInvalid, ...timeRangeProps }: OnTimeChangeProps) => {
      if (!isInvalid) {
        updateTimeRange({ refreshInterval: timeRange.refresh.value, ...timeRangeProps });
      }
    },
    [updateTimeRange, timeRange.refresh]
  );

  const handleTimeRangeChange = useCallback(
    ({ start, end }: Pick<OnTimeChangeProps, 'start' | 'end'>) => {
      updateTimeRange({ start, end, refreshInterval: timeRange.refresh.value });
    },
    [updateTimeRange, timeRange.refresh]
  );

  const handleRefresh = useCallback(
    (refreshProps: OnRefreshProps) => {
      updateTimeRange(refreshProps);
      setLastReloadTime(Date.now());
    },
    [updateTimeRange]
  );

  return (
    <>
      <FlyoutSummaryHeader
        timeRange={timeRange}
        onTimeChange={handleTimeChange}
        onRefresh={handleRefresh}
      />

      <EuiSpacer size="m" />

      {dataStreamStat ? (
        <FlyoutSummaryKpis
          dataStreamStat={dataStreamStat}
          dataStreamDetails={dataStreamDetails}
          isLoading={dataStreamDetailsLoading}
          timeRange={timeRange}
        />
      ) : (
        <FlyoutSummaryKpisLoading />
      )}

      <EuiSpacer />

      <DegradedDocs
        dataStream={dataStream}
        timeRange={timeRange}
        lastReloadTime={lastReloadTime}
        onTimeRangeChange={handleTimeRangeChange}
      />
    </>
  );
}
