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
  options: SeriesConfig['metricOptions'];
}

export function ReportMetricOptions({ seriesId, options: opts }: Props) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const onChange = (value: string) => {
    setSeries(seriesId, {
      ...series,
      selectedMetricField: value,
    });
  };

  const options = opts ?? [];

  return (
    <EuiSuperSelect
      fullWidth
      compressed
      prepend={'Metric'}
      options={options.map(({ label, field: fd, id }) => ({
        value: fd || id,
        inputDisplay: label,
      }))}
      valueOfSelected={series.selectedMetricField || options?.[0].field || options?.[0].id}
      onChange={(value) => onChange(value)}
    />
  );
}
