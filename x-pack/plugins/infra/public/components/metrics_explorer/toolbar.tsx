/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, EuiText } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { Toolbar } from '../eui/toolbar';
import { MetricsExplorerKueryBar } from './kuery_bar';
import { MetricsExplorerMetrics } from './metrics';
import { MetricsExplorerGroupBy } from './group_by';
import { MetricsExplorerAggregationPicker } from './aggregation';

interface Props {
  intl: InjectedIntl;
  derivedIndexPattern: StaticIndexPattern;
  timeRange: MetricsExplorerTimeOptions;
  options: MetricsExplorerOptions;
  onRefresh: () => void;
  onTimeChange: (start: string, end: string) => void;
  onGroupByChange: (groupBy: string | null) => void;
  onFilterQuerySubmit: (query: string) => void;
  onMetricsChange: (metrics: MetricsExplorerMetric[]) => void;
  onAggregationChange: (aggregation: MetricsExplorerAggregation) => void;
}

export const MetricsExplorerToolbar = injectI18n(
  ({
    timeRange,
    derivedIndexPattern,
    options,
    onTimeChange,
    onRefresh,
    onGroupByChange,
    onFilterQuerySubmit,
    onMetricsChange,
    onAggregationChange,
  }: Props) => {
    const isDefaultOptions =
      options.aggregation === MetricsExplorerAggregation.avg && options.metrics.length === 0;
    return (
      <Toolbar>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={options.aggregation === MetricsExplorerAggregation.count ? 2 : false}>
            <MetricsExplorerAggregationPicker
              fullWidth
              options={options}
              onChange={onAggregationChange}
            />
          </EuiFlexItem>
          {options.aggregation !== MetricsExplorerAggregation.count && (
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.infra.metricsExplorer.aggregationLabel"
                defaultMessage="of"
              />
            </EuiText>
          )}
          {options.aggregation !== MetricsExplorerAggregation.count && (
            <EuiFlexItem grow={2}>
              <MetricsExplorerMetrics
                autoFocus={isDefaultOptions}
                fields={derivedIndexPattern.fields}
                options={options}
                onChange={onMetricsChange}
              />
            </EuiFlexItem>
          )}
          <EuiText size="s" color="subdued">
            <FormattedMessage
              id="xpack.infra.metricsExplorer.groupByToolbarLabel"
              defaultMessage="graph per"
            />
          </EuiText>
          <EuiFlexItem grow={1}>
            <MetricsExplorerGroupBy
              onChange={onGroupByChange}
              fields={derivedIndexPattern.fields}
              options={options}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <MetricsExplorerKueryBar
              derivedIndexPattern={derivedIndexPattern}
              onSubmit={onFilterQuerySubmit}
              value={options.filterQuery}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ marginRight: 5 }}>
            <EuiSuperDatePicker
              start={timeRange.from}
              end={timeRange.to}
              onTimeChange={({ start, end }) => onTimeChange(start, end)}
              onRefresh={onRefresh}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Toolbar>
    );
  }
);
