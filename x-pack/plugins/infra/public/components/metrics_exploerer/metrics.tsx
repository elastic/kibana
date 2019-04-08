/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
  fields: StaticIndexPatternField[];
}

interface SelectedOption {
  value: string;
  label: string;
}

export const MetricsExplorerMetrics = injectI18n(({ intl, options, onChange, fields }: Props) => {
  const colors = Object.keys(MetricsExplorerColor) as MetricsExplorerColor[];

  const handleChange = useCallback(
    selectedOptions => {
      if (selectedOptions.length < 4) {
        onChange(
          selectedOptions.map((opt: SelectedOption, index: number) => ({
            aggregation: options.aggregation,
            field: opt.value,
            color: colors[index],
          }))
        );
      }
    },
    [options, onChange]
  );

  const comboOptions = fields.map(field => ({ label: field.name, value: field.name }));
  const selectedOptios = options.metrics
    .filter(m => m.aggregation !== MetricsExplorerAggregation.count)
    .map(metric => ({
      label: metric.field || '',
      value: metric.field || '',
      color: colorTransformer(metric.color || MetricsExplorerColor.color0),
    }));

  const placeholderText = intl.formatMessage({
    id: 'xpack.infra.metricsExplorer.metricComboBoxPlaceholder',
    defaultMessage: 'choose a metric to plot',
  });

  return (
    <EuiComboBox
      isDisabled={options.aggregation === MetricsExplorerAggregation.count}
      placeholder={placeholderText}
      fullWidth
      options={comboOptions}
      selectedOptions={selectedOptios}
      onChange={handleChange}
      isClearable={false}
    />
  );
});
