/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback } from 'react';
import { MetricsExplorerOptions } from '../hooks/use_metrics_explorer_options';
import { DerivedIndexPattern } from '../../../../containers/metrics_source';

interface Props {
  options: MetricsExplorerOptions;
  onChange: (groupBy: string | null | string[]) => void;
  fields: DerivedIndexPattern['fields'];
  errorOptions?: string[];
}

export const MetricsExplorerGroupBy = ({ options, onChange, fields, errorOptions }: Props) => {
  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const groupBy = selectedOptions.map((option) => option.label);
      onChange(groupBy);
    },
    [onChange]
  );

  const selectedOptions = Array.isArray(options.groupBy)
    ? options.groupBy.map((field) => ({
        label: field,
        color: errorOptions?.includes(field) ? 'danger' : undefined,
      }))
    : options.groupBy
    ? [
        {
          label: options.groupBy,
          color: errorOptions?.includes(options.groupBy) ? 'danger' : undefined,
        },
      ]
    : [];

  return (
    <EuiComboBox
      data-test-subj="metricsExplorer-groupBy"
      placeholder={i18n.translate('xpack.infra.metricsExplorer.groupByLabel', {
        defaultMessage: 'Everything',
      })}
      aria-label={i18n.translate('xpack.infra.metricsExplorer.groupByAriaLabel', {
        defaultMessage: 'Graph per',
      })}
      fullWidth
      singleSelection={false}
      selectedOptions={selectedOptions}
      options={fields
        .filter((f) => f.aggregatable && f.type === 'string')
        .map((f) => ({ label: f.name }))}
      onChange={handleChange}
      isClearable={true}
    />
  );
};
