/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { useUrlStorage } from '../../hooks/use_url_storage';
import { CustomReportField } from '../custom_report_field';
import FieldValueSuggestions from '../../../field_value_suggestions';
import { DataSeries, URLReportDefinition } from '../../types';
import { SeriesChartTypesSelect } from './chart_types';
import { OperationTypeSelect } from './operation_type_select';
import { DatePickerCol } from './date_picker_col';
import { parseCustomFieldName } from '../../configurations/lens_attributes';
import { PersistableFilter } from '../../../../../../../lens/common';
import { ExistsFilter } from '../../../../../../../../../src/plugins/data/common/es_query/filters';
import { ESFilter } from '../../../../../../../../../typings/elasticsearch';

function getColumnType(dataView: DataSeries, selectedDefinition: URLReportDefinition) {
  const { reportDefinitions } = dataView;
  const customColumn = reportDefinitions.find((item) => item.custom);
  if (customColumn?.field && selectedDefinition[customColumn?.field]) {
    const { columnType } = parseCustomFieldName(customColumn.field, dataView, selectedDefinition);

    return columnType;
  }
  return null;
}

const MaxWidthStyle = { maxWidth: 250 };

export function ReportDefinitionCol({
  dataViewSeries,
  seriesId,
}: {
  dataViewSeries: DataSeries;
  seriesId: string;
}) {
  const { indexPattern } = useAppIndexPatternContext();

  const { series, setSeries } = useUrlStorage(seriesId);

  const { reportDefinitions: rtd = {} } = series;

  const {
    reportDefinitions,
    labels,
    filters,
    defaultSeriesType,
    hasOperationType,
    yAxisColumns,
  } = dataViewSeries;

  const onChange = (field: string, value?: string[]) => {
    if (!value?.[0]) {
      delete rtd[field];
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...rtd },
      });
    } else {
      setSeries(seriesId, {
        ...series,
        reportDefinitions: { ...rtd, [field]: value },
      });
    }
  };

  const columnType = getColumnType(dataViewSeries, rtd);
  const queryFilters: ESFilter[] = [];

  (filters ?? []).forEach((qFilter: PersistableFilter | ExistsFilter) => {
    if (qFilter.query) {
      queryFilters.push(qFilter.query);
    }
    const existFilter = qFilter as ExistsFilter;
    if (existFilter.exists) {
      queryFilters.push({ exists: existFilter.exists });
    }
  });

  return (
    <FlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <DatePickerCol seriesId={seriesId} />
      </EuiFlexItem>
      {indexPattern &&
        reportDefinitions.map(({ field, custom, options, defaultValue }) => (
          <EuiFlexItem key={field}>
            {!custom ? (
              <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center" wrap>
                <EuiFlexItem>
                  <FieldValueSuggestions
                    label={labels[field]}
                    sourceField={field}
                    indexPattern={indexPattern}
                    selectedValue={rtd?.[field]}
                    onChange={(val?: string[]) => onChange(field, val)}
                    filters={queryFilters}
                    time={series.time}
                    fullWidth={true}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <CustomReportField
                field={field}
                options={options}
                defaultValue={defaultValue}
                seriesId={seriesId}
              />
            )}
          </EuiFlexItem>
        ))}
      {(hasOperationType || columnType === 'operation') && (
        <EuiFlexItem style={MaxWidthStyle}>
          <OperationTypeSelect
            seriesId={seriesId}
            defaultOperationType={yAxisColumns[0].operationType}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem style={MaxWidthStyle}>
        <SeriesChartTypesSelect seriesId={seriesId} defaultChartType={defaultSeriesType} />
      </EuiFlexItem>
    </FlexGroup>
  );
}

const FlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;
