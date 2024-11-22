/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { DataViewFieldBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import React, { useCallback } from 'react';

export type MetricsExplorerFields = Array<DataViewFieldBase & { aggregatable: boolean }>;

export type GroupBy = string | null | string[];
export interface GroupByOptions {
  groupBy: GroupBy;
}

interface Props {
  options: GroupByOptions;
  onChange: (groupBy: GroupBy) => void;
  fields: MetricsExplorerFields;
}

export function GroupBy({ options, onChange, fields, ...rest }: Props) {
  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const groupBy = selectedOptions.map((option) => option.label);
      onChange(groupBy);
    },
    [onChange]
  );

  const selectedOptions = Array.isArray(options.groupBy)
    ? options.groupBy.map((field) => ({ label: field }))
    : options.groupBy
    ? [{ label: options.groupBy }]
    : [];

  return (
    <EuiComboBox
      data-test-subj="thresholdRuleMetricsExplorer-groupBy"
      placeholder={i18n.translate('xpack.observability.threshold.ruleExplorer.groupByLabel', {
        defaultMessage: 'Everything',
      })}
      aria-label={i18n.translate('xpack.observability.threshold.ruleExplorer.groupByAriaLabel', {
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
      {...rest}
    />
  );
}
