/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback, useState } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import { colorTransformer, Color } from '../../../../../common/color_palette';
import { MetricsExplorerMetric } from '../../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';

interface Props {
  autoFocus?: boolean;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
  fields: IFieldType[];
}

interface SelectedOption {
  value: string;
  label: string;
}

export const MetricsExplorerMetrics = ({ options, onChange, fields, autoFocus = false }: Props) => {
  const colors = Object.keys(Color) as Array<keyof typeof Color>;
  const [shouldFocus, setShouldFocus] = useState(autoFocus);

  // the EuiCombobox forwards the ref to an input element
  const autoFocusInputElement = useCallback(
    (inputElement: HTMLInputElement | null) => {
      if (inputElement && shouldFocus) {
        inputElement.focus();
        setShouldFocus(false);
      }
    },
    [shouldFocus]
  );

  const handleChange = useCallback(
    (selectedOptions) => {
      onChange(
        selectedOptions.map((opt: SelectedOption, index: number) => ({
          aggregation: options.aggregation,
          field: opt.value,
          color: colors[index],
        }))
      );
    },
    [onChange, options.aggregation, colors]
  );

  const comboOptions = fields.map((field) => ({ label: field.name, value: field.name }));
  const selectedOptions = options.metrics
    .filter((m) => m.aggregation !== 'count')
    .map((metric) => ({
      label: metric.field || '',
      value: metric.field || '',
      color: colorTransformer(metric.color || Color.color0),
    }));

  const placeholderText = i18n.translate('xpack.infra.metricsExplorer.metricComboBoxPlaceholder', {
    defaultMessage: 'choose a metric to plot',
  });

  return (
    <EuiComboBox
      aria-label={placeholderText}
      isDisabled={options.aggregation === 'count'}
      placeholder={placeholderText}
      fullWidth
      options={comboOptions}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      isClearable={true}
      inputRef={autoFocusInputElement}
    />
  );
};
