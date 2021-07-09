/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { SeriesConfig } from '../types';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { ReportFilters } from './columns/report_filters';
import { OperationTypeSelect } from './columns/operation_type_select';
import { useSeriesStorage } from '../hooks/use_series_storage';
import { parseCustomFieldName } from '../configurations/lens_attributes';

function getColumnType(seriesConfig: SeriesConfig, selectedMetricField?: string) {
  const { columnType } = parseCustomFieldName(seriesConfig, selectedMetricField);

  return columnType;
}

interface Props {
  seriesId: string;
  seriesConfig: SeriesConfig;
}
export function ExpandedSeriesRow({ seriesId, seriesConfig }: Props) {
  const { getSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  if (!seriesConfig) {
    return null;
  }

  const { selectedMetricField } = series ?? {};

  const { hasOperationType, yAxisColumns } = seriesConfig;

  const columnType = getColumnType(seriesConfig, selectedMetricField);

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ minWidth: 600 }}>
          <ReportDefinitionCol seriesId={seriesId} seriesConfig={seriesConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ minWidth: 600 }}>
          <EuiFormRow
            label={i18n.translate('xpack.observability.expView.seriesBuilder.selectFilters', {
              defaultMessage: 'Filters',
            })}
          >
            <ReportFilters seriesId={seriesId} seriesConfig={seriesConfig} />
          </EuiFormRow>
        </EuiFlexItem>
        {(hasOperationType || columnType === 'operation') && (
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.observability.expView.seriesBuilder.operation', {
                defaultMessage: 'Operation',
              })}
            >
              <OperationTypeSelect
                seriesId={seriesId}
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
