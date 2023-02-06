/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PostureInput, PosturePolicyTemplate } from '../../../common/types';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';

interface Props {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

export const PolicyInputSelector = ({ input, disabled, setInput }: Props) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template);
  const options = baseOptions.map((option) => ({
    ...option,
    disabled: option.disabled || disabled,
    label: option.label,
    icon: option.icon,
  }));

  return (
    <div>
      <ConfigureIntegrationInfo type={input.policy_template} />
      <RadioGroup
        disabled={disabled}
        idSelected={input.type}
        options={options}
        onChange={(inputType) => setInput(inputType as PostureInput)}
        size="m"
      />
      <PolicyInputInfo type={input.type} />
    </div>
  );
};

const PolicyInputInfo = ({ type }: { type: PostureInput }) => {
  switch (type) {
    case 'cloudbeat/cis_aws':
    case 'cloudbeat/cis_eks':
      return <AWSSetupInfoContent />;
    default:
      return null;
  }
};

const AWSSetupInfoContent = () => (
  <>
    <EuiSpacer />
    <EuiTitle size="xs">
      <h2>
        <FormattedMessage
          id="xpack.csp.awsIntegration.setupInfoContentTitle"
          defaultMessage="Setup Access"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer />
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.setupInfoContent"
        defaultMessage="The integration will need elevated access to run some CIS benchmark rules. Select your preferred
    method of providing the AWS credentials this integration will use. You can follow these
    step-by-step instructions to generate the necessary credentials."
      />
    </EuiText>
  </>
);

const ConfigureIntegrationInfo = ({ type }: { type: PosturePolicyTemplate }) => (
  <>
    <EuiTitle size="xs">
      <h2>
        <FormattedMessage
          id="xpack.csp.awsIntegration.configureIntegrationLabel"
          defaultMessage="Configure your integration"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer />
    <EuiText color={'subdued'} size="s">
      {type === 'kspm' && (
        <FormattedMessage
          id="xpack.csp.awsIntegration.configureKspmIntegrationDescription"
          defaultMessage="Select the Kuberentes cluster type you want to monitor"
        />
      )}
      {type === 'cspm' && (
        <FormattedMessage
          id="xpack.csp.awsIntegration.configureCspmIntegrationDescription"
          defaultMessage="Select the cloud service provider (CSP) you want to monitor"
        />
      )}
    </EuiText>
    <EuiSpacer />
  </>
);
