/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker, EuiText } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { SourceFields } from '../../../common/graphql/types';
import { MetricsExplorerMetric } from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { Toolbar } from '../eui/toolbar';
import { MetricsExploererKueryBar } from './kuery_bar';
import { MetricsExplorerMetrics } from './metrics';

interface Props {
  intl: InjectedIntl;
  source: SourceFields.Configuration | undefined;
  derivedIndexPattern: StaticIndexPattern;
  currentTimerange: MetricsExplorerTimeOptions;
  options: MetricsExplorerOptions;
  onRefresh: () => void;
  onTimeChange: (start: string, end: string) => void;
  onGroupByChange: (groupBy: string | null) => void;
  onFilterQuerySubmit: (query: string) => void;
  onMetricsChange: (metrics: MetricsExplorerMetric[]) => void;
}

export const MetricsExplorerToolbar = injectI18n(
  ({
    currentTimerange,
    derivedIndexPattern,
    options,
    onTimeChange,
    onRefresh,
    onGroupByChange,
    onFilterQuerySubmit,
    onMetricsChange,
  }: Props) => {
    return (
      <Toolbar>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <MetricsExplorerMetrics
              fields={derivedIndexPattern.fields}
              options={options}
              onChange={onMetricsChange}
            />
          </EuiFlexItem>
          <EuiText size="s" color="subdued">
            <strong>by</strong>
          </EuiText>
          <EuiFlexItem>
            <EuiComboBox
              placeholder="Everything"
              fullWidth
              singleSelection={{ asPlainText: true }}
              selectedOptions={(options.groupBy && [{ label: options.groupBy }]) || []}
              options={derivedIndexPattern.fields
                .filter(f => f.aggregatable && f.type === 'string')
                .map(f => ({ label: f.name }))}
              onChange={selectedOptions => {
                const groupBy = (selectedOptions.length === 1 && selectedOptions[0].label) || null;
                onGroupByChange(groupBy);
              }}
              isClearable={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <MetricsExploererKueryBar
              derivedIndexPattern={derivedIndexPattern}
              onSubmit={onFilterQuerySubmit}
              value={options.filterQuery}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ marginRight: 5 }}>
            <EuiSuperDatePicker
              start={currentTimerange.from}
              end={currentTimerange.to}
              onTimeChange={({ start, end }) => onTimeChange(start, end)}
              onRefresh={onRefresh}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </Toolbar>
    );
  }
);
