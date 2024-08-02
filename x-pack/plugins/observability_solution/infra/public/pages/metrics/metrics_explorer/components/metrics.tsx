/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useMemo } from 'react';
import { METRICS_EXPLORER_API_MAX_METRICS } from '@kbn/metrics-data-access-plugin/common';
import { useMetricsDataViewContext } from '../../../../containers/metrics_source';
import { colorTransformer, Color } from '../../../../../common/color_palette';
import { MetricsExplorerMetric } from '../../../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';

interface Props {
  autoFocus?: boolean;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
}

interface SelectedOption {
  value: string;
  label: string;
}

const placeholderText = i18n.translate('xpack.infra.metricsExplorer.metricComboBoxPlaceholder', {
  defaultMessage: 'choose a metric to plot',
});

const comboValidationText = i18n.translate('xpack.infra.metricsExplorer.maxItemsSelected', {
  defaultMessage: 'Maximum number of {maxMetrics} metrics reached.',
  values: { maxMetrics: METRICS_EXPLORER_API_MAX_METRICS },
});

export const MetricsExplorerMetrics = ({ options, onChange, autoFocus = false }: Props) => {
  const { metricsView } = useMetricsDataViewContext();
  const colors = Object.keys(Color) as Array<keyof typeof Color>;
  const [shouldFocus, setShouldFocus] = useState(autoFocus);

  const maxMetricsReached = options.metrics.length >= METRICS_EXPLORER_API_MAX_METRICS;

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

  const comboOptions = useMemo(
    (): EuiComboBoxOptionOption[] =>
      maxMetricsReached
        ? [{ label: comboValidationText, disabled: true }]
        : (metricsView?.fields ?? []).map((field) => ({
            label: field.name,
            value: field.name,
          })),
    [maxMetricsReached, metricsView?.fields]
  );

  const selectedOptions = options.metrics
    .filter((m) => m.aggregation !== 'count')
    .map((metric) => ({
      label: metric.field || '',
      value: metric.field || '',
      color: colorTransformer(metric.color || Color.color0),
    }));

  const handleOnKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (maxMetricsReached) {
      ev.preventDefault();
    }

    return ev;
  };

  const renderFields = useCallback((option: EuiComboBoxOptionOption) => {
    const { label, disabled } = option;

    if (disabled) {
      return (
        <EuiFlexGroup
          direction="column"
          justifyContent="center"
          alignItems="center"
          data-test-subj="infraMetricsExplorerMaxMetricsReached"
        >
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" justifyContent="center" alignItems="center">
              <EuiIcon type="iInCircle" size="s" />
              <EuiText size="xs">{label}</EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return label;
  }, []);

  return (
    <EuiComboBox
      data-test-subj="metricsExplorer-metrics"
      aria-label={placeholderText}
      isDisabled={options.aggregation === 'count'}
      placeholder={placeholderText}
      fullWidth
      options={comboOptions}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      onKeyDown={handleOnKeyDown}
      isClearable
      inputRef={autoFocusInputElement}
      renderOption={renderFields}
    />
  );
};
