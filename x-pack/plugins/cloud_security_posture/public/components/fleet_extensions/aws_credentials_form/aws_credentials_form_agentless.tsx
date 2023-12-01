/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import { getPosturePolicy } from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import { AwsFormProps } from './aws_credentials_form';

const AWSSetupInfoContentAgentless = () => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.awsIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.awsIntegration.gettingStarted.setupInfoContent"
          defaultMessage="TBD Agentless guide"
        />
      </EuiText>
    </>
  );
};

export const AwsCredentialsFormAgentless = ({ input, newPolicy, updatePolicy }: AwsFormProps) => {
  const options = getAwsCredentialsFormOptions();
  const group = options[DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE];
  const fields = getInputVarsFields(input, group.fields);

  return (
    <>
      <AWSSetupInfoContentAgentless />
      <EuiSpacer size="l" />
      <AwsInputVarFields
        fields={fields}
        onChange={(key, value) => {
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }));
        }}
      />
    </>
  );
};
