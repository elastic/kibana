/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import styled from 'styled-components';
import { useSeriesStorage } from '../../hooks/use_series_storage';
import { ReportMetricOptions } from '../report_metric_options';
import { SeriesConfig } from '../../types';
import { SeriesChartTypesSelect } from './chart_types';
import { OperationTypeSelect } from './operation_type_select';
import { DatePickerCol } from './date_picker_col';
import { parseCustomFieldName } from '../../configurations/lens_attributes';
import { ReportDefinitionField } from './report_definition_field';

function getColumnType(seriesConfig: SeriesConfig, selectedMetricField?: string) {
  const { columnType } = parseCustomFieldName(seriesConfig, selectedMetricField);

  return columnType;
}

export function ReportDefinitionCol({
  seriesConfig,
  seriesId,
}: {
  seriesConfig: SeriesConfig;
  seriesId: string;
}) {
  const { getSeries, setSeries } = useSeriesStorage();

  const series = getSeries(seriesId);

  const { reportDefinitions: selectedReportDefinitions = {}, selectedMetricField } = series ?? {};

  const {
    definitionFields,
    defaultSeriesType,
    hasOperationType,
    yAxisColumns,
    metricOptions,
  } = seriesConfig;

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

  const columnType = getColumnType(seriesConfig, selectedMetricField);

  return (
    <FlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <DatePickerCol seriesId={seriesId} />
      </EuiFlexItem>
      <EuiHorizontalRule margin="xs" />
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
      {metricOptions && (
        <EuiFlexItem>
          <ReportMetricOptions options={metricOptions} seriesId={seriesId} />
        </EuiFlexItem>
      )}
      {(hasOperationType || columnType === 'operation') && (
        <EuiFlexItem>
          <OperationTypeSelect
            seriesId={seriesId}
            defaultOperationType={yAxisColumns[0].operationType}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <SeriesChartTypesSelect
          seriesId={seriesId}
          defaultChartType={defaultSeriesType}
          seriesTypes={seriesConfig.seriesTypes}
        />
      </EuiFlexItem>
    </FlexGroup>
  );
}

const FlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;
