/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPanel, EuiLink, EuiText, EuiForm, EuiRadioGroup, EuiSpacer } from '@elastic/eui';

import { SHIPPER_DISPLAY } from '../../../../../../../../../src/plugins/custom_integrations/common';

type Value = 'beats' | 'agent';

interface Option {
  value: Value;
  label: string;
}

export interface Props {
  onChange: (value: Value) => void;
}

const link = (
  <EuiLink href="#">
    <FormattedMessage
      id="xpack.fleet.epm.integrationPreference.titleLink"
      defaultMessage="Elastic Agent and Beats"
    />
  </EuiLink>
);

const title = (
  <FormattedMessage
    id="xpack.fleet.epm.integrationPreference.title"
    defaultMessage="When an integration is available for {link}, use:"
    values={{ link }}
  />
);

export const IntegrationPreference = ({ onChange }: Props) => {
  const [idSelected, setIdSelected] = React.useState<Value>('agent');

  const options: Option[] = [
    {
      value: 'agent',
      label: i18n.translate('xpack.fleet.epm.integrationPreference.elasticAgentLabel', {
        defaultMessage: 'Elastic Agent (recommended)',
      }),
    },
    {
      value: 'beats',
      label: SHIPPER_DISPLAY.beats,
    },
  ];

  const radios = options.map((option) => ({
    id: option.value,
    ...option,
  }));

  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      <EuiText size="s">{title}</EuiText>
      <EuiSpacer size="m" />
      <EuiForm>
        <EuiRadioGroup
          options={radios}
          idSelected={idSelected}
          onChange={(id, value) => {
            setIdSelected(id as Value);
            onChange(value as Value);
          }}
          name="preference"
        />
      </EuiForm>
    </EuiPanel>
  );
};
