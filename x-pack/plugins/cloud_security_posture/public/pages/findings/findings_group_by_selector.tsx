/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiComboBox, EuiFormLabel, type EuiComboBoxOptionOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GroupBy } from './findings_container';

interface Props {
  type: GroupBy;
  options: Array<EuiComboBoxOptionOption<GroupBy>>;
  onChange(selectedOptions: Array<EuiComboBoxOptionOption<GroupBy>>): void;
}

export const FindingsGroupBySelector = ({ type, options, onChange }: Props) => (
  <EuiComboBox
    prepend={<GroupByLabel />}
    singleSelection={{ asPlainText: true }}
    options={options}
    selectedOptions={options.filter((o) => o.value === type)}
    onChange={onChange}
  />
);

const GroupByLabel = () => (
  <EuiFormLabel>
    <FormattedMessage
      id="xpack.csp.findings.groupBySelector.groupByLabel"
      defaultMessage="Group by"
    />
  </EuiFormLabel>
);
