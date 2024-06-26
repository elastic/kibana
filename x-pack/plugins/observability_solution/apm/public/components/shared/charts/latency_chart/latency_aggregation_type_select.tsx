/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

const options: Array<{ value: LatencyAggregationType; text: string }> = [
  { value: LatencyAggregationType.avg, text: 'Average' },
  { value: LatencyAggregationType.p95, text: '95th percentile' },
  { value: LatencyAggregationType.p99, text: '99th percentile' },
];

export function LatencyAggregationTypeSelect({
  latencyAggregationType,
  onChange,
}: {
  latencyAggregationType?: LatencyAggregationType;
  onChange: (value: LatencyAggregationType) => void;
}) {
  return (
    <EuiSelect
      data-test-subj="apmLatencyChartSelect"
      compressed
      prepend={i18n.translate('xpack.apm.serviceOverview.latencyChartTitle.prepend', {
        defaultMessage: 'Metric',
      })}
      options={options}
      value={latencyAggregationType}
      onChange={(nextOption) => onChange(nextOption.target.value as LatencyAggregationType)}
    />
  );
}
