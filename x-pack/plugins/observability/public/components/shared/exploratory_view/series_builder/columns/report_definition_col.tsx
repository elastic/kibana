/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_storage';
import { CustomReportField } from '../custom_report_field';
import FieldValueSuggestions from '../../../field_value_suggestions';
import { DataSeries } from '../../types';
import { SeriesChartTypesSelect } from './chart_types';
import { OperationTypeSelect } from './operation_type_select';
import { DatePickerCol } from './date_picker_col';
import { parseCustomFieldName } from '../../configurations/lens_attributes';

function getColumnType(dataView: DataSeries, selectedDefinition: Record<string, string>) {
  const { reportDefinitions } = dataView;
  const customColumn = reportDefinitions.find((item) => item.custom);
  if (customColumn?.field && selectedDefinition[customColumn?.field]) {
    const { columnType } = parseCustomFieldName(customColumn.field, dataView, selectedDefinition);

    return columnType;
  }
  return null;
}

const MaxWidthStyle = { maxWidth: 250 };

export function ReportDefinitionCol({ dataViewSeries }: { dataViewSeries: DataSeries }) {
  const { indexPattern } = useAppIndexPatternContext();

  const { series, setSeries } = useUrlStorage(NEW_SERIES_KEY);

  const { reportDefinitions: rtd = {} } = series;

  const {
    reportDefinitions,
    labels,
    filters,
    defaultSeriesType,
    hasOperationType,
    yAxisColumns,
  } = dataViewSeries;

  const onChange = (field: string, value?: string) => {
    if (!value) {
      delete rtd[field];
      setSeries(NEW_SERIES_KEY, {
        ...series,
        reportDefinitions: { ...rtd },
      });
    } else {
      setSeries(NEW_SERIES_KEY, {
        ...series,
        reportDefinitions: { ...rtd, [field]: value },
      });
    }
  };

  const onRemove = (field: string) => {
    delete rtd[field];
    setSeries(NEW_SERIES_KEY, {
      ...series,
      reportDefinitions: rtd,
    });
  };

  const columnType = getColumnType(dataViewSeries, rtd);

  return (
    <FlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <DatePickerCol seriesId={NEW_SERIES_KEY} />
      </EuiFlexItem>
      {indexPattern &&
        reportDefinitions.map(({ field, custom, options, defaultValue }) => (
          <EuiFlexItem key={field}>
            {!custom ? (
              <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center" wrap>
                <EuiFlexItem grow={false} style={{ flexBasis: 250 }}>
                  <FieldValueSuggestions
                    label={labels[field]}
                    sourceField={field}
                    indexPattern={indexPattern}
                    value={rtd?.[field]}
                    onChange={(val?: string) => onChange(field, val)}
                    filters={(filters ?? []).map(({ query }) => query)}
                    time={series.time}
                    fullWidth={true}
                  />
                </EuiFlexItem>
                {rtd?.[field] && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      className="globalFilterItem"
                      iconSide="right"
                      iconType="cross"
                      color="hollow"
                      onClick={() => onRemove(field)}
                      iconOnClick={() => onRemove(field)}
                      iconOnClickAriaLabel={'Click to remove'}
                      onClickAriaLabel={'Click to remove'}
                    >
                      {rtd?.[field]}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            ) : (
              <CustomReportField
                field={field}
                options={options}
                defaultValue={defaultValue}
                seriesId={NEW_SERIES_KEY}
              />
            )}
          </EuiFlexItem>
        ))}
      {(hasOperationType || columnType === 'operation') && (
        <EuiFlexItem style={MaxWidthStyle}>
          <OperationTypeSelect
            seriesId={NEW_SERIES_KEY}
            defaultOperationType={yAxisColumns[0].operationType}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem style={MaxWidthStyle}>
        <SeriesChartTypesSelect seriesId={NEW_SERIES_KEY} defaultChartType={defaultSeriesType} />
      </EuiFlexItem>
    </FlexGroup>
  );
}

const FlexGroup = styled(EuiFlexGroup)`
  width: 100%;
`;
