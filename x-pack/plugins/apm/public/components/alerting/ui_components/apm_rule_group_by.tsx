/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import {
  CONTAINER_ID,
  KUBERNETES_POD_NAME,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_VERSION,
} from '../../../../common/es_fields/apm';

interface Props {
  options: { groupBy: string[] | string | undefined };
  onChange: (groupBy: string | null | string[]) => void;
  errorOptions?: string[];
}

const fields: string[] = [
  SERVICE_VERSION,
  SERVICE_RUNTIME_VERSION,
  SERVICE_NODE_NAME,
  KUBERNETES_POD_NAME,
  CONTAINER_ID,
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
      options={fields.map((field) => ({ label: field }))}
      onChange={handleChange}
      isClearable={true}
    />
  );
}
