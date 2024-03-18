/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { cspIntegrationDocsNavigation } from '../../../common/navigation/constants';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormAgentlessOptions,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import { getAwsCredentialsType, getPosturePolicy } from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import {
  AwsFormProps,
  ReadDocumentation,
  AWSSetupInfoContent,
  AwsCredentialTypeSelector,
} from './aws_credentials_form';

export const AwsCredentialsFormAgentless = ({ input, newPolicy, updatePolicy }: AwsFormProps) => {
  const awsCredentialsType = getAwsCredentialsType(input) || DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  const options = getAwsCredentialsFormOptions();
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const integrationLink = cspIntegrationDocsNavigation.cspm.getStartedPath;

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentAgentless"
            defaultMessage="Utilize AWS Access Keys to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={integrationLink} target="_blank">
                  <FormattedMessage
                    id="xpack.csp.awsIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        label={i18n.translate('xpack.csp.awsIntegration.awsCredentialTypeSelectorLabelAgentless', {
          defaultMessage: 'Preferred method',
        })}
        type={awsCredentialsType}
        options={getAwsCredentialsFormAgentlessOptions()}
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
