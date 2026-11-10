/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { EbtClickAttrsWithoutAction } from '@kbn/ebt-click';
import { getEbtProps } from '@kbn/ebt-click';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { APM_EBT_ACTIONS } from '../../../app/ebt_constants';

const options: Array<{ value: LatencyAggregationType; text: string }> = [
  { value: LatencyAggregationType.avg, text: 'Avg' },
  { value: LatencyAggregationType.p95, text: 'p95th' },
  { value: LatencyAggregationType.p99, text: 'p99th' },
];

export function LatencyAggregationTypeSelect({
  latencyAggregationType,
  onChange,
  ebt,
  compact,
}: {
  latencyAggregationType?: LatencyAggregationType;
  onChange: (value: LatencyAggregationType) => void;
  ebt?: EbtClickAttrsWithoutAction;
  /** When true, hides the "Metric" prepend to save space in narrow hosts (e.g. flyouts). */
  compact?: boolean;
}) {
  return (
    <EuiSelect
      data-test-subj="apmLatencyChartSelect"
      {...(ebt
        ? getEbtProps({ action: APM_EBT_ACTIONS.SET_LATENCY_AGGREGATION_TYPE, ...ebt })
        : {})}
      compressed
      aria-label={i18n.translate('xpack.apm.serviceOverview.latencyChartTitle.selector', {
        defaultMessage: 'Metric selector',
      })}
      prepend={
        compact
          ? undefined
          : i18n.translate('xpack.apm.serviceOverview.latencyChartTitle.prepend', {
              defaultMessage: 'Metric',
            })
      }
      options={options}
      value={latencyAggregationType}
      onChange={(nextOption) => onChange(nextOption.target.value as LatencyAggregationType)}
    />
  );
}
