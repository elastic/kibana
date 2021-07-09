/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesConfig } from '../types';

interface Props {
  seriesId: string;
  defaultValue?: string;
  metricOptions: SeriesConfig['metricOptions'];
}

const SELECT_REPORT_METRIC = 'SELECT_REPORT_METRIC';

export function ReportMetricOptions({ seriesId, metricOptions }: Props) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const onChange = (value: string) => {
    setSeries(seriesId, {
      ...series,
      selectedMetricField: value,
    });
  };

  if (!series.dataType) {
    return null;
  }

  const options = (metricOptions ?? []).map(({ label, field: fd, id }) => ({
    value: fd || id,
    inputDisplay: label,
  }));

  return (
    <EuiSuperSelect
      fullWidth
      options={
        series.selectedMetricField
          ? options
          : [{ value: SELECT_REPORT_METRIC, inputDisplay: 'Select report metric' }, ...options]
      }
      valueOfSelected={series.selectedMetricField || SELECT_REPORT_METRIC}
      onChange={(value) => onChange(value)}
      style={{ minWidth: 220 }}
    />
  );
}
