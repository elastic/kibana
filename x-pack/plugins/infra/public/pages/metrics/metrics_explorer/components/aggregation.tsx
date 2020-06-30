/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback } from 'react';
import { MetricsExplorerAggregation } from '../../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';
import {
  metricsExplorerAggregationRT,
  METRIC_EXPLORER_AGGREGATIONS,
} from '../../../../../common/http_api/metrics_explorer';

interface Props {
  options: MetricsExplorerOptions;
  fullWidth: boolean;
  onChange: (aggregation: MetricsExplorerAggregation) => void;
}

export const MetricsExplorerAggregationPicker = ({ options, onChange }: Props) => {
  const AGGREGATION_LABELS = {
    ['avg']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.avg', {
      defaultMessage: 'Average',
    }),
    ['sum']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.sum', {
      defaultMessage: 'Sum',
    }),
    ['max']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.max', {
      defaultMessage: 'Max',
    }),
    ['min']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.min', {
      defaultMessage: 'Min',
    }),
    ['cardinality']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.cardinality', {
      defaultMessage: 'Cardinality',
    }),
    ['rate']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.rate', {
      defaultMessage: 'Rate',
    }),
    ['p95']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.p95', {
      defaultMessage: '95th Percentile',
    }),
    ['p99']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.p99', {
      defaultMessage: '99th Percentile',
    }),
    ['count']: i18n.translate('xpack.infra.metricsExplorer.aggregationLables.count', {
      defaultMessage: 'Document count',
    }),
  };

  const handleChange = useCallback(
    (e) => {
      const aggregation =
        (metricsExplorerAggregationRT.is(e.target.value) && e.target.value) || 'avg';
      onChange(aggregation);
    },
    [onChange]
  );

  const placeholder = i18n.translate('xpack.infra.metricsExplorer.aggregationSelectLabel', {
    defaultMessage: 'Select an aggregation',
  });

  return (
    <EuiSelect
      aria-label={placeholder}
      placeholder={placeholder}
      fullWidth
      value={options.aggregation}
      options={METRIC_EXPLORER_AGGREGATIONS.map((k) => ({
        text: AGGREGATION_LABELS[k as MetricsExplorerAggregation],
        value: k,
      }))}
      onChange={handleChange}
    />
  );
};
