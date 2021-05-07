/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { useUrlStorage } from '../hooks/use_url_storage';
import { ReportDefinition } from '../types';

interface Props {
  field: string;
  seriesId: string;
  defaultValue?: string;
  options: ReportDefinition['options'];
}

export function CustomReportField({ field, seriesId, options: opts, defaultValue }: Props) {
  const { series, setSeries } = useUrlStorage(seriesId);

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
      options={options.map(({ label, field: fd }) => ({
        value: fd,
        inputDisplay: label,
      }))}
      valueOfSelected={reportDefinitions?.[field]?.[0] || defaultValue || options?.[0].field}
      onChange={(value) => onChange(value)}
    />
  );
}
