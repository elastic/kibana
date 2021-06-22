/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export type PolicySelectorOption = EuiComboBoxOptionOption & {
  apmServerUrl?: string;
  secretToken?: string;
};

interface Props {
  options: PolicySelectorOption[];
  selectedOption?: PolicySelectorOption;
  onChange: (selectedOption?: PolicySelectorOption) => void;
  fleetLink: {
    label: string;
    href: string;
  };
}

export function PolicySelector({
  options,
  selectedOption,
  onChange,
  fleetLink,
}: Props) {
  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.apm.tutorial.agent_config.choosePolicyLabel',
        { defaultMessage: 'Choose a policy' }
      )}
      labelAppend={
        <EuiText size="xs">
          <EuiLink href={fleetLink.href}>{fleetLink.label}</EuiLink>
        </EuiText>
      }
    >
      <EuiComboBox
        isClearable={false}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOption ? [selectedOption] : []}
        onChange={(selectedOptions) => {
          onChange(selectedOptions[0]);
        }}
      />
    </EuiFormRow>
  );
}
