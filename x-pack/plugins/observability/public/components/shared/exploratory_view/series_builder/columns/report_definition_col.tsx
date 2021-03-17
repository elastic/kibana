/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FieldValueSelection } from '../../../field_value_selection';
import { useIndexPatternContext } from '../../../../../hooks/use_default_index_pattern';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { useUrlStorage } from '../../hooks/use_url_strorage';

export const ReportDefinitionCol = () => {
  const { indexPattern } = useIndexPatternContext();

  const { newSeries, setNewSeries } = useUrlStorage();

  const { reportType, reportDefinitions: rtd = {} } = newSeries;

  const { reportDefinitions, labels, filters } = getDefaultConfigs({
    reportType: reportType!,
    seriesId: 'newSeries',
  });

  const onChange = (field: string, value: string) => {
    setNewSeries({
      ...newSeries,
      reportDefinitions: { ...rtd, [field]: value },
    });
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {reportDefinitions.map(({ field }) => (
        <EuiFlexItem key={field}>
          <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <FieldValueSelection
                label={labels[field]}
                sourceField={field}
                indexPattern={indexPattern}
                value={reportDefinitions?.[field]}
                onChange={(val: string) => onChange(field, val)}
                filters={(filters ?? []).map(({ query }) => query)}
              />
            </EuiFlexItem>
            {rtd?.[field] && (
              <EuiFlexItem grow={false}>
                <EuiBadge iconSide="right" iconType="cross">
                  {rtd?.[field]}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
