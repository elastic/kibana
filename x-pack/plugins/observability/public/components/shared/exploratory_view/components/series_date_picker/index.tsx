/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';

import { useHasData } from '../../../../../hooks/use_has_data';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { useQuickTimeRanges } from '../../../../../hooks/use_quick_time_ranges';
import { SeriesUrl } from '../../types';
import { ReportTypes } from '../../configurations/constants';

export interface TimePickerTime {
  from: string;
  to: string;
}

export interface TimePickerQuickRange extends TimePickerTime {
  display: string;
}

interface Props {
  seriesId: number;
  series: SeriesUrl;
}

export function SeriesDatePicker({ series, seriesId }: Props) {
  const { onRefreshTimeRange } = useHasData();

  const commonlyUsedRanges = useQuickTimeRanges();

  const { setSeries, reportType, allSeries } = useSeriesStorage();

  function onTimeChange({ start, end }: { start: string; end: string }) {
    onRefreshTimeRange();
    if (reportType === ReportTypes.KPI) {
      allSeries.forEach((currSeries, seriesIndex) => {
        setSeries(seriesIndex, { ...currSeries, time: { from: start, to: end } });
      });
    } else {
      setSeries(seriesId, { ...series, time: { from: start, to: end } });
    }
  }

  return (
    <EuiSuperDatePicker
      start={series?.time?.from}
      end={series?.time?.to}
      onTimeChange={onTimeChange}
      commonlyUsedRanges={commonlyUsedRanges}
      onRefresh={onTimeChange}
      showUpdateButton={false}
    />
  );
}
