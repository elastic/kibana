/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFormLabel, EuiSelect, EuiFormControlLayout, type EuiSelectOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GroupBy } from './findings_container';

interface Props {
  type: GroupBy;
  options: EuiSelectOption[];
  onChange(type: GroupBy): void;
}

export const FindingsGroupBySelector = ({ type, options, onChange }: Props) => (
  <EuiFormControlLayout prepend={<GroupByLabel />} style={{ maxWidth: 275 }}>
    <EuiSelect
      value={type}
      options={options}
      onChange={(event) => onChange(event.target.value as GroupBy)}
    />
  </EuiFormControlLayout>
);

const GroupByLabel = () => (
  <EuiFormLabel>
    <FormattedMessage
      id="xpack.csp.findings.groupBySelector.groupByLabel"
      defaultMessage="Group by"
    />
  </EuiFormLabel>
);
