/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { SeriesConfig } from '../../types';
import { ReportDefinitionField } from './report_definition_field';

export function ReportDefinitionCol({
  seriesConfig,
  seriesId,
}: {
  seriesConfig: SeriesConfig;
  seriesId: string;
}) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const { reportDefinitions: selectedReportDefinitions = {} } = series ?? {};

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
    <EuiFlexGroup gutterSize="s" direction="column">
      {definitionFields.map((field) => (
        <EuiFlexItem key={field}>
          <ReportDefinitionField
            seriesId={seriesId}
            seriesConfig={seriesConfig}
            field={field}
            onChange={onChange}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
