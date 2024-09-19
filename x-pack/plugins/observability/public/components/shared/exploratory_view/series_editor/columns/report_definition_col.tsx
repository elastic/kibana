/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesConfig, SeriesUrl } from '../../types';
import { ReportDefinitionField } from './report_definition_field';

export function ReportDefinitionCol({
  seriesId,
  series,
  seriesConfig,
}: {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}) {
  const { setSeries } = useSeriesStorage();

  const { reportDefinitions: selectedReportDefinitions = {} } = series;

  const { definitionFields } = seriesConfig;

  const onChange = (field: string, value?: string[]) => {
    if (!value?.[0]) {
      delete selectedReportDefinitions[field];
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...selectedReportDefinitions },
      });
    } else {
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...selectedReportDefinitions, [field]: value },
      });
    }
  };

  return (
    <EuiFlexGroup gutterSize="s">
      {definitionFields.map((field) => (
        <EuiFlexItem key={field} grow={1}>
          <ReportDefinitionField
            seriesId={seriesId}
            series={series}
            seriesConfig={seriesConfig}
            field={field}
            onChange={onChange}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
