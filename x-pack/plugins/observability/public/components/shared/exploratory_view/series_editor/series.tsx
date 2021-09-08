/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexItem, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { BuilderItem } from '../types';
import { SeriesActions } from '../series_viewer/columns/series_actions';
import { SeriesInfo } from '../series_viewer/columns/series_info';
import { DataTypesSelect } from './columns/data_type_select';
import { DatePickerCol } from './columns/date_picker_col';
import { ExpandedSeriesRow } from './expanded_series_row';
import { SeriesName } from '../series_viewer/columns/series_name';
import { ReportMetricOptions } from './report_metric_options';
import { Breakdowns } from '../series_viewer/columns/breakdowns';

interface Props {
  item: BuilderItem;
  seriesId: number;
  isExpanded: boolean;
  toggleExpanded: () => void;
}

export function Series({ item, seriesId, isExpanded, toggleExpanded }: Props) {
  const { series, seriesConfig } = item;

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          {series.dataType && series.selectedMetricField ? (
            <EuiButtonIcon
              onClick={toggleExpanded}
              isDisabled={!series.dataType || !series.selectedMetricField}
              aria-label={isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL}
              aria-expanded={Boolean(isExpanded)}
              aria-controls={`exploratoryViewExpandedRow${seriesId}`}
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            />
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeriesInfo seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SeriesName seriesId={seriesId} series={series} />
        </EuiFlexItem>
        <EuiFlexItem>
          <DataTypesSelect seriesId={seriesId} series={series} />
        </EuiFlexItem>
        <EuiFlexItem>
          <ReportMetricOptions
            series={series}
            seriesId={seriesId}
            metricOptions={seriesConfig?.metricOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DatePickerCol seriesId={seriesId} series={series} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Breakdowns seriesConfig={seriesConfig} seriesId={seriesId} series={series} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SeriesActions seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isExpanded ? (
        <ExpandedSeriesRow seriesId={seriesId} series={series} seriesConfig={seriesConfig} />
      ) : null}
    </EuiPanel>
  );
}

const COLLAPSE_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.collapse', {
  defaultMessage: 'Collapse',
});

const EXPAND_LABEL = i18n.translate('xpack.observability.expView.seriesBuilder.expand', {
  defaultMessage: 'Exapnd',
});
