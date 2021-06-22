/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { ReportDefinition } from '../types';

interface Props {
  field: string;
  seriesId: string;
  defaultValue?: string;
  options: ReportDefinition['options'];
}

export function CustomReportField({ field, seriesId, options: opts }: Props) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const { reportDefinitions: rtd = {} } = series;

  const onChange = (value: string) => {
    setSeries(seriesId, { ...series, reportDefinitions: { ...rtd, [field]: [value] } });
  };

  const { reportDefinitions } = series;

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
      valueOfSelected={reportDefinitions?.[field]?.[0] || options?.[0].field || options?.[0].id}
      onChange={(value) => onChange(value)}
    />
  );
}
