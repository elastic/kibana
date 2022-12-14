/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PostureInput, PosturePolicyTemplate } from '../../../common/constants';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { InlineRadioGroup } from './inline_radio_group';

type Props = { input: NewPackagePolicyPostureInput } & (
  | { disabled: true }
  | {
      disabled?: false;
      updatePolicyInput(id: string): void;
    }
);

const noop = () => {};

export const PolicyInputSelector = ({ input, ...rest }: Props) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template as PosturePolicyTemplate);
  const options = rest.disabled
    ? baseOptions.map((option) => ({
        ...option,
        disabled: true,
      }))
    : baseOptions;

  if (!input) return null;

  return (
    <div>
      <InlineRadioGroup
        idSelected={input.type}
        options={options}
        onChange={rest.disabled ? noop : rest.updatePolicyInput}
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
