/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AwsCredentialsType } from '../../../../common/types';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormManualOptionsAgentless,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import { getAwsCredentialsType, getPosturePolicy } from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import { AwsFormProps, ReadDocumentation } from './aws_credentials_form';

// TODO: create a shared component between agent-based and agentless
// TODO: update tranalsation keys
// TODO: get text
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

// TODO: create a shared component between agent-based and agentless, pass options and label
// TODO: update tranalsation keys
const AwsCredentialTypeSelector = ({
  type,
  onChange,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
}) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabelAgentless', {
      defaultMessage: 'Preferred method',
    })}
  >
    <EuiSelect
      fullWidth
      options={getAwsCredentialsFormManualOptionsAgentless()}
      value={type}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AwsCredentialsType);
      }}
    />
  </EuiFormRow>
);

export const AwsCredentialsFormAgentless = ({ input, newPolicy, updatePolicy }: AwsFormProps) => {
  const awsCredentialsType = getAwsCredentialsType(input) || DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  const options = getAwsCredentialsFormOptions();
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const integrationLink = cspIntegrationDocsNavigation.cspm.getStartedPath;

  return (
    <>
      <AWSSetupInfoContentAgentless />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        type={awsCredentialsType}
        onChange={(optionId) => {
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              'aws.credentials.type': { value: optionId },
            })
          );
        }}
      />
      <EuiSpacer size="m" />
      {group.info}
      <EuiSpacer size="m" />
      <ReadDocumentation url={integrationLink} />
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
