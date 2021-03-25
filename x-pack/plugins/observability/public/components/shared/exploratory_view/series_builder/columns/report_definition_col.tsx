/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useIndexPatternContext } from '../../hooks/use_default_index_pattern';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_strorage';
import { CustomReportField } from '../custom_report_field';
import FieldValueSuggestions from '../../../field_value_suggestions';

export function ReportDefinitionCol() {
  const { indexPattern } = useIndexPatternContext();

  const { series, setSeries } = useUrlStorage(NEW_SERIES_KEY);

  const { reportType, reportDefinitions: rtd = {} } = series;

  const { reportDefinitions, labels, filters } = getDefaultConfigs({
    reportType: reportType!,
    seriesId: 'newSeries',
  });

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
                    value={reportDefinitions?.[field]}
                    onChange={(val?: string) => onChange(field, val)}
                    filters={(filters ?? []).map(({ query }) => query)}
                    time={series.time}
                  />
                </EuiFlexItem>
                {rtd?.[field] && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      iconSide="right"
                      iconType="cross"
                      color="hollow"
                      onClick={() => onRemove(field)}
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
    </EuiFlexGroup>
  );
}
