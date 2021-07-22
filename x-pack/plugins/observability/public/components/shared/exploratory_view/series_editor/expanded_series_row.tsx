/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { SeriesConfig, SeriesUrl } from '../types';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { OperationTypeSelect } from './columns/operation_type_select';
import { parseCustomFieldName } from '../configurations/lens_attributes';
import { SeriesFilter } from '../series_viewer/columns/series_filter';

function getColumnType(seriesConfig: SeriesConfig, selectedMetricField?: string) {
  const { columnType } = parseCustomFieldName(seriesConfig, selectedMetricField);

  return columnType;
}

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export function ExpandedSeriesRow({ seriesId, series, seriesConfig }: Props) {
  if (!seriesConfig) {
    return null;
  }

  const { selectedMetricField } = series ?? {};

  const { hasOperationType, yAxisColumns } = seriesConfig;

  const columnType = getColumnType(seriesConfig, selectedMetricField);

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <ReportDefinitionCol seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem style={{ minWidth: 600 }}>
              <EuiFormRow label={FILTERS_LABEL} fullWidth>
                <SeriesFilter seriesConfig={seriesConfig} seriesId={seriesId} series={series} />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {(hasOperationType || columnType === 'operation') && (
          <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
            <EuiFormRow label={OPERATION_LABEL}>
              <OperationTypeSelect
                seriesId={seriesId}
                series={series}
                defaultOperationType={yAxisColumns[0].operationType}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
    </div>
  );
}

const FILTERS_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.selectFilters', {
  defaultMessage: 'Filters',
});

const OPERATION_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.operation', {
  defaultMessage: 'Operation',
});
