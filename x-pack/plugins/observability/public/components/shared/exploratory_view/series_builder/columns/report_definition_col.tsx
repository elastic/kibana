/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useIndexPatternContext } from '../../hooks/use_default_index_pattern';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_storage';
import { CustomReportField } from '../custom_report_field';
import FieldValueSuggestions from '../../../field_value_suggestions';
import { DataSeries } from '../../types';
import { SeriesChartTypesSelect } from './chart_types';
import { OperationTypeSelect } from './operation_type_select';

export function ReportDefinitionCol({ dataViewSeries }: { dataViewSeries: DataSeries }) {
  const { indexPattern } = useIndexPatternContext();

  const { series, setSeries } = useUrlStorage(NEW_SERIES_KEY);

  const { reportDefinitions: rtd = {} } = series;

  const {
    reportDefinitions,
    labels,
    filters,
    defaultSeriesType,
    hasOperationType,
    yAxisColumn,
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {indexPattern &&
        reportDefinitions.map(({ field, custom, options, defaultValue }) => (
          <EuiFlexItem key={field}>
            {!custom ? (
              <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <FieldValueSuggestions
                    label={labels[field]}
                    sourceField={field}
                    indexPattern={indexPattern}
                    value={rtd?.[field]}
                    onChange={(val?: string) => onChange(field, val)}
                    filters={(filters ?? []).map(({ query }) => query)}
                    time={series.time}
                    width={200}
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
      <EuiFlexItem style={{ width: 200 }}>
        <SeriesChartTypesSelect seriesId={NEW_SERIES_KEY} defaultChartType={defaultSeriesType} />
      </EuiFlexItem>
      {hasOperationType && (
        <EuiFlexItem style={{ width: 200 }}>
          <OperationTypeSelect
            seriesId={NEW_SERIES_KEY}
            defaultOperationType={yAxisColumn.operationType}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
