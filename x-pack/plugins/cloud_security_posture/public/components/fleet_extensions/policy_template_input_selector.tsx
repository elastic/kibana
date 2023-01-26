/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type { PostureInput } from '../../../common/types';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';

interface Props {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

const InputsLabelKSPM = () => (
  <FormattedMessage
    id="xpack.csp.fleetIntegration.configureKspmIntegrationDescription"
    defaultMessage="Select the Kuberentes cluster type you want to monitor and then fill in the name and description to help identify this integration"
  />
);

const InputsLabelCSPM = () => (
  <FormattedMessage
    id="xpack.csp.fleetIntegration.configureCspmIntegrationDescription"
    defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
  />
);

export const PolicyTemplateInputSelector = ({ input, disabled, setInput }: Props) => {
  const baseOptions = useMemo(
    () => getPolicyTemplateInputOptions(input.policy_template),
    [input.policy_template]
  );

  const options = useMemo(
    () => baseOptions.map((option) => ({ ...option, disabled: option.disabled || disabled })),
    [baseOptions, disabled]
  );

  return (
    <>
      <EuiText color={'subdued'} size="s">
        {input.policy_template === 'kspm' && <InputsLabelKSPM />}
        {input.policy_template === 'cspm' && <InputsLabelCSPM />}
      </EuiText>
      <EuiSpacer />
      <RadioGroup
        disabled={disabled}
        idSelected={input.type}
        options={options}
        onChange={(inputType) => setInput(inputType as PostureInput)}
        size="m"
      />
    </>
  );
};
