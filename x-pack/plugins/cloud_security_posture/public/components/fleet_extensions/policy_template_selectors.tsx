/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import type { PostureInput, PosturePolicyTemplate } from '../../../common/types';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';
import { AwsCredentialsForm } from './aws_credentials_form';

interface PolicyTemplateVarsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyPostureInput;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

export const PolicyTemplateVarsForm = ({ input, ...props }: PolicyTemplateVarsFormProps) => {
  switch (input.type) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return <AwsCredentialsForm {...props} input={input} />;
    default:
      return null;
  }
};

interface PolicyTemplateInfoProps {
  postureType: PosturePolicyTemplate;
}

export const PolicyTemplateInfo = ({ postureType }: PolicyTemplateInfoProps) => (
  <EuiText color={'subdued'} size="s">
    {postureType === KSPM_POLICY_TEMPLATE && (
      <FormattedMessage
        id="xpack.csp.fleetIntegration.configureKspmIntegrationDescription"
        defaultMessage="Select the Kubernetes cluster type you want to monitor and then fill in the name and description to help identify this integration"
      />
    )}
    {postureType === CSPM_POLICY_TEMPLATE && (
      <FormattedMessage
        id="xpack.csp.fleetIntegration.configureCspmIntegrationDescription"
        defaultMessage="Select the cloud service provider (CSP) you want to monitor and then fill in the name and description to help identify this integration"
      />
    )}
  </EuiText>
);

interface Props {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

export const PolicyTemplateInputSelector = ({ input, disabled, setInput }: Props) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template);
  const options = baseOptions.map((option) => ({
    ...option,
    disabled: option.disabled || disabled,
    label: option.label,
    icon: option.icon,
  }));

  return (
    <RadioGroup
      disabled={disabled}
      idSelected={input.type}
      options={options}
      onChange={(inputType) => setInput(inputType as PostureInput)}
      size="m"
    />
  );
};
