/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../types';

interface Props {
  seriesId: string;
  series: SeriesUrl;
  defaultValue?: string;
  metricOptions: SeriesConfig['metricOptions'];
}

const SELECT_REPORT_METRIC = 'SELECT_REPORT_METRIC';

export function ReportMetricOptions({ seriesId, series, metricOptions }: Props) {
  const { setSeries } = useSeriesStorage();

  const onChange = (value: string) => {
    setSeries(seriesId, {
      ...series,
      selectedMetricField: value,
    });
  };

  if (!series.dataType) {
    return null;
  }

  const options = (metricOptions ?? []).map(({ label, field, id }) => ({
    value: field || id,
    inputDisplay: label,
  }));

  return (
    <EuiSuperSelect
      fullWidth
      options={
        series.selectedMetricField
          ? options
          : [{ value: SELECT_REPORT_METRIC, inputDisplay: SELECT_REPORT_METRIC_LABEL }, ...options]
      }
      valueOfSelected={series.selectedMetricField || SELECT_REPORT_METRIC}
      onChange={(value) => onChange(value)}
      style={{ minWidth: 220 }}
    />
  );
}

const SELECT_REPORT_METRIC_LABEL = i18n.translate(
  'xpack.observability.expView.seriesEditor.selectReportMetric',
  {
    defaultMessage: 'Select report metric',
  }
);
