/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiToolTip,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { PostureInput } from '../../../common/constants';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { InlineRadioGroup } from './inline_radio_group';

interface Props {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

const RadioLabel = ({
  label,
  icon,
  disabled,
  tooltip,
}: ReturnType<typeof getPolicyTemplateInputOptions>[number]) => (
  <EuiToolTip content={tooltip} anchorProps={{ style: { width: '100%' } }}>
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="none">
      <EuiFlexItem grow={true}>{label}</EuiFlexItem>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={icon}
            css={
              disabled &&
              css`
                filter: grayscale(1);
              `
            }
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </EuiToolTip>
);

export const PolicyInputSelector = ({ input, disabled, setInput }: Props) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template);
  const options = baseOptions.map((option) => ({
    ...option,
    disabled: option.disabled || disabled,
    label: <RadioLabel {...option} />,
  }));

  return (
    <div>
      <InlineRadioGroup
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
