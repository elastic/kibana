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
  options: { groupBy: string[] | string | undefined };
  onChange: (groupBy: string | null | string[]) => void;
  errorOptions?: string[];
}

interface FieldType {
  name: string;
  type: string;
  aggregatable: boolean;
}

const fields: FieldType[] = [
  { name: 'service.version', type: 'string', aggregatable: true },
  { name: 'service.runtime.version', type: 'string', aggregatable: true },
  { name: 'service.node.name', type: 'string', aggregatable: true },
  { name: 'kubernetes.pod.name', type: 'string', aggregatable: true },
  { name: 'container.id', type: 'string', aggregatable: true },
];

export function APMRuleGroupBy({ options, onChange, errorOptions }: Props) {
  const handleChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const groupByOption = selectedOptions.map((option) => option.label);
      onChange(groupByOption);
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
      data-test-subj="apmRule-groupBy"
      placeholder={i18n.translate('xpack.apm.ruleFlyout.groupByLabel', {
        defaultMessage: 'Everything',
      })}
      aria-label={i18n.translate('xpack.apm.ruleFlyout.groupByAriaLabel', {
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
}
