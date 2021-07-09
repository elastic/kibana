/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import { EuiBadge, EuiBadgeGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useRouteMatch } from 'react-router-dom';
import { SeriesChartTypes } from './chart_types';
import { AppDataType, SeriesConfig, SeriesUrl } from '../../types';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { SeriesColorPicker } from '../../components/series_color_picker';

const dataTypes: Record<AppDataType, string> = {
  synthetics: 'Synthetics Monitoring',
  ux: 'User Experience',
  mobile: 'Mobile Experience',
  apm: 'APM',
  infra_logs: 'Logs',
  infra_metrics: 'Metrics',
};

interface Props {
  seriesId: string;
  series: SeriesUrl;
  seriesConfig?: SeriesConfig;
}

export function SeriesInfo({ seriesId, series, seriesConfig }: Props) {
  const isConfigure = !!useRouteMatch('/exploratory-view/configure');

  const { dataType, reportDefinitions, selectedMetricField } = series;

  const { loading } = useAppIndexPatternContext();

  const isIncomplete =
    (!dataType || isEmpty(reportDefinitions) || !selectedMetricField) && !loading;

  if (!seriesConfig) {
    return null;
  }

  const { definitionFields, labels } = seriesConfig;

  const incompleteDefinition = isEmpty(reportDefinitions)
    ? `Missing ${labels?.[definitionFields[0]]}`
    : '';

  let incompleteMessage = !selectedMetricField ? 'Missing report metric' : incompleteDefinition;

  if (!dataType) {
    incompleteMessage = 'Missing Data type';
  }

  if (!isIncomplete && seriesConfig && isConfigure) {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <SeriesChartTypes seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeriesColorPicker seriesId={seriesId} series={series} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        {isIncomplete && !loading && <EuiBadge color="warning">{incompleteMessage}</EuiBadge>}
      </EuiFlexItem>
      {!isConfigure && (
        <EuiFlexItem>
          <EuiBadgeGroup>
            <EuiBadge>{dataTypes[dataType]}</EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
