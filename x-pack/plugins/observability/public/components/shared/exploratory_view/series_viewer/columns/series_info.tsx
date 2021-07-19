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
import { i18n } from '@kbn/i18n';
import { SeriesChartTypes } from './chart_types';
import { SeriesConfig, SeriesUrl } from '../../types';
import { useAppIndexPatternContext } from '../../hooks/use_app_index_pattern';
import { SeriesColorPicker } from '../../components/series_color_picker';
import { dataTypes } from '../../series_editor/columns/data_type_select';

interface Props {
  seriesId: number;
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
    ? i18n.translate('xpack.observability.overview.exploratoryView.missingReportDefinition', {
        defaultMessage: 'Missing {reportDefinition}',
        values: { reportDefinition: labels?.[definitionFields[0]] },
      })
    : '';

  let incompleteMessage = !selectedMetricField ? MISSING_REPORT_METRIC_LABEL : incompleteDefinition;

  if (!dataType) {
    incompleteMessage = MISSING_DATA_TYPE_LABEL;
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
        {isIncomplete && <EuiBadge color="warning">{incompleteMessage}</EuiBadge>}
      </EuiFlexItem>
      {!isConfigure && (
        <EuiFlexItem>
          <EuiBadgeGroup>
            <EuiBadge>{dataTypes.find(({ id }) => id === dataType)!.label}</EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

const MISSING_REPORT_METRIC_LABEL = i18n.translate(
  'xpack.observability.overview.exploratoryView.missingReportMetric',
  {
    defaultMessage: 'Missing report metric',
  }
);

const MISSING_DATA_TYPE_LABEL = i18n.translate(
  'xpack.observability.overview.exploratoryView.missingDataType',
  {
    defaultMessage: 'Missing data type',
  }
);
