/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { MetricsExplorerAggregation } from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (aggregation: MetricsExplorerAggregation) => void;
}

const isMetricsExplorerAggregation = (subject: any): subject is MetricsExplorerAggregation => {
  return Object.keys(MetricsExplorerAggregation).includes(subject);
};

export const MetricsExplorerAggregationPicker = injectI18n(({ intl, options, onChange }: Props) => {
  const intlPrefix = 'xpack.infra.metricsExplorer';

  const AGGREGATION_LABELS = {
    [MetricsExplorerAggregation.avg]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.avg`,
      defaultMessage: 'Average',
    }),
    [MetricsExplorerAggregation.max]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.max`,
      defaultMessage: 'Max',
    }),
    [MetricsExplorerAggregation.min]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.min`,
      defaultMessage: 'Min',
    }),
    [MetricsExplorerAggregation.cardinality]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.cardinality`,
      defaultMessage: 'Cardinality',
    }),
    [MetricsExplorerAggregation.rate]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.rate`,
      defaultMessage: 'Rate',
    }),
    [MetricsExplorerAggregation.count]: intl.formatMessage({
      id: `${intlPrefix}.aggregationLables.count`,
      defaultMessage: 'Document Count',
    }),
  };

  const handleChange = useCallback(
    e => {
      const aggregation =
        (isMetricsExplorerAggregation(e.target.value) && e.target.value) ||
        MetricsExplorerAggregation.avg;
      onChange(aggregation);
    },
    [options, onChange]
  );

  return (
    <EuiSelect
      placeholder={intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.aggregationSelectLabel',
        defaultMessage: 'Select an aggregation',
      })}
      value={options.aggregation}
      options={Object.keys(MetricsExplorerAggregation).map(k => ({
        text: AGGREGATION_LABELS[k as MetricsExplorerAggregation],
        value: k,
      }))}
      onChange={handleChange}
    />
  );
});
