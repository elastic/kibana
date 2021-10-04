/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiHorizontalRule } from '@elastic/eui';
import { SeriesConfig, SeriesUrl } from '../types';
import { ReportDefinitionCol } from './columns/report_definition_col';
import { OperationTypeSelect } from './columns/operation_type_select';
import { parseCustomFieldName } from '../configurations/lens_attributes';
import { SeriesFilter } from './columns/series_filter';
import { DatePickerCol } from './columns/date_picker_col';
import { Breakdowns } from './columns/breakdowns';

function getColumnType(seriesConfig: SeriesConfig, selectedMetricField?: string) {
  const { columnType } = parseCustomFieldName(seriesConfig, selectedMetricField);

  return columnType;
}

interface Props {
  seriesId: number;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}
export function ExpandedSeriesRow(seriesProps: Props) {
  const { seriesConfig, series, seriesId } = seriesProps;

  if (!seriesConfig) {
    return null;
  }

  const { selectedMetricField } = series ?? {};

  const { hasOperationType, yAxisColumns } = seriesConfig;

  const columnType = getColumnType(seriesConfig, selectedMetricField);

  return (
    <div style={{ width: '100%' }}>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <EuiFormRow label={DATE_LABEL} fullWidth>
            <DatePickerCol {...seriesProps} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} series={series} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiFormRow label={FILTERS_LABEL} fullWidth>
        <SeriesFilter seriesConfig={seriesConfig} seriesId={seriesId} series={series} />
      </EuiFormRow>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label={BREAKDOWNS_LABEL}>
            <Breakdowns {...seriesProps} />
          </EuiFormRow>
        </EuiFlexItem>
        {(hasOperationType || columnType === 'operation') && (
          <EuiFlexItem>
            <EuiFormRow label={OPERATION_LABEL}>
              <OperationTypeSelect
                {...seriesProps}
                defaultOperationType={yAxisColumns[0].operationType}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}

const BREAKDOWNS_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.breakdowns', {
  defaultMessage: 'Breakdowns',
});

const FILTERS_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.selectFilters', {
  defaultMessage: 'Filters',
});

const OPERATION_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.operation', {
  defaultMessage: 'Operation',
});

const DATE_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.date', {
  defaultMessage: 'Date',
});
