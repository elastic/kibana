/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../types';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { RECORDS_FIELD, RECORDS_PERCENTAGE_FIELD } from '../configurations/constants';

interface Props {
  seriesId: number;
  series: SeriesUrl;
  defaultValue?: string;
  metricOptions: SeriesConfig['metricOptions'];
}

const SELECT_REPORT_METRIC = 'SELECT_REPORT_METRIC';

export function ReportMetricOptions({ seriesId, series, metricOptions }: Props) {
  const { setSeries } = useSeriesStorage();

  const { indexPatterns } = useAppIndexPatternContext();

  const onChange = (value: string) => {
    setSeries(seriesId, {
      ...series,
      selectedMetricField: value,
    });
  };

  if (!series.dataType) {
    return null;
  }

  const indexPattern = indexPatterns?.[series.dataType];

  const options = (metricOptions ?? []).map(({ label, field, id }) => {
    let disabled = false;

    if (field !== RECORDS_FIELD && field !== RECORDS_PERCENTAGE_FIELD && field) {
      disabled = !Boolean(indexPattern?.getFieldByName(field));
    }
    return {
      disabled,
      value: field || id,
      dropdownDisplay: disabled ? (
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.observability.expView.seriesEditor.selectReportMetric.noFieldData"
              defaultMessage="No data available for field {field}."
              values={{
                field: <strong>{field}</strong>,
              }}
            />
          }
        >
          <span>{label}</span>
        </EuiToolTip>
      ) : (
        label
      ),
      inputDisplay: label,
    };
  });

  return (
    <EuiSuperSelect
      fullWidth
      options={
        series.selectedMetricField
          ? options
          : [
              {
                value: SELECT_REPORT_METRIC,
                inputDisplay: SELECT_REPORT_METRIC_LABEL,
                disabled: false,
              },
              ...options,
            ]
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
