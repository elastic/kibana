/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';

interface Props {
  options: { groupBy: string[] | undefined };
  fields: string[];
  preSelectedOptions: string[];
  onChange: (groupBy: string[] | null) => void;
  errorOptions?: string[];
}

export function APMRuleGroupBy({
  options,
  fields,
  preSelectedOptions,
  onChange,
  errorOptions,
}: Props) {
  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const groupByOption = selectedOptions.map((option) => option.label);
      onChange([...new Set(preSelectedOptions.concat(groupByOption))]);
    },
    [onChange, preSelectedOptions]
  );

  const getPreSelectedOptions = () => {
    return preSelectedOptions.map((field) => ({
      label: field,
      color: 'lightgray',
      disabled: true,
    }));
  };

  const getUserSelectedOptions = (groupBy: string[] | undefined) => {
    return (groupBy ?? [])
      .filter((group) => !preSelectedOptions.includes(group))
      .map((field) => ({
        label: field,
        color: errorOptions?.includes(field) ? 'danger' : undefined,
      }));
  };

  const selectedOptions = [
    ...getPreSelectedOptions(),
    ...getUserSelectedOptions(options.groupBy),
  ];

  return (
    <EuiComboBox
      data-test-subj="apmRule-groupBy"
      placeholder={i18n.translate('xpack.apm.ruleFlyout.groupByLabel', {
        defaultMessage: 'Everything',
      })}
      aria-label={i18n.translate('xpack.apm.ruleFlyout.groupByAriaLabel', {
        defaultMessage: 'Group by',
      })}
      fullWidth
      singleSelection={false}
      selectedOptions={selectedOptions}
      options={fields.map((field) => ({ label: field }))}
      onChange={handleChange}
      isClearable={false}
    />
  );
}
