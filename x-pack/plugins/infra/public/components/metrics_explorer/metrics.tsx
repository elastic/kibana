/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback, useState } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import { MetricsExplorerMetric } from '../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { isDisplayable } from '../../utils/is_displayable';

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
  const colors = Object.keys(MetricsExplorerColor) as MetricsExplorerColor[];
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
    selectedOptions => {
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

  const comboOptions = fields
    .filter(field => isDisplayable(field))
    .map(field => ({ label: field.name, value: field.name }));
  const selectedOptions = options.metrics
    .filter(m => m.aggregation !== 'count')
    .map(metric => ({
      label: metric.field || '',
      value: metric.field || '',
      color: colorTransformer(metric.color || MetricsExplorerColor.color0),
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
