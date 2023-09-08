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
import { groupBy } from 'lodash';
import React from 'react';
import { PolicyOption } from './get_policy_options';

interface Props {
  options: PolicyOption[];
  selectedOption?: PolicyOption;
  onChange: (selectedOption?: PolicyOption) => void;
  fleetLink?: {
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
  const { fleetAgents, standalone } = groupBy(options, 'type');

  const standaloneComboboxOptions: EuiComboBoxOptionOption[] =
    standalone?.map(({ key, label }) => ({ key, label })) || [];

  const fleetAgentsComboboxOptions = fleetAgents?.length
    ? [
        {
          key: 'fleet_policies',
          label: i18n.translate(
            'xpack.apm.tutorial.agent_config.fleetPoliciesLabel',
            { defaultMessage: 'Fleet policies' }
          ),
          options: fleetAgents.map(({ key, label }) => ({ key, label })),
        },
      ]
    : [];

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.apm.tutorial.agent_config.choosePolicyLabel',
        { defaultMessage: 'Choose policy' }
      )}
      labelAppend={
        fleetLink && (
          <EuiText size="xs">
            <EuiLink
              data-test-subj="apmPolicySelectorLink"
              href={fleetLink.href}
            >
              {fleetLink.label}
            </EuiLink>
          </EuiText>
        )
      }
      helpText={i18n.translate(
        'xpack.apm.tutorial.agent_config.choosePolicy.helper',
        {
          defaultMessage:
            'Adds the selected policy configuration to the snippet below.',
        }
      )}
    >
      <EuiComboBox
        data-test-subj={`policySelector_${selectedOption?.key}`}
        isClearable={false}
        singleSelection={{ asPlainText: true }}
        options={[...standaloneComboboxOptions, ...fleetAgentsComboboxOptions]}
        selectedOptions={
          selectedOption
            ? [{ key: selectedOption.key, label: selectedOption.label }]
            : []
        }
        onChange={(selectedOptions) => {
          const newSelectedOption = options.find(
            ({ key }) => key === selectedOptions[0].key
          );
          onChange(newSelectedOption);
        }}
      />
    </EuiFormRow>
  );
}
