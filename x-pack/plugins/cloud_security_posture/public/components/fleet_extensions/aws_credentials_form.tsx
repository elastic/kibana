/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiFieldPassword,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CSPM_POLICY_TEMPLATE } from '../../../common/constants';
import { PosturePolicyTemplate } from '../../../common/types';
import { RadioGroup } from './csp_boxed_radio_group';
import { getPosturePolicy, NewPackagePolicyPostureInput } from './utils';
import { cspIntegrationDocsNavigation } from '../../common/navigation/constants';

interface AWSSetupInfoContentProps {
  policyTemplate: PosturePolicyTemplate | undefined;
}

const AWSSetupInfoContent = ({ policyTemplate }: AWSSetupInfoContentProps) => {
  const { cspm, kspm } = cspIntegrationDocsNavigation;
  const integrationLink =
    !policyTemplate || policyTemplate === CSPM_POLICY_TEMPLATE
      ? cspm.getStartedPath
      : kspm.getStartedPath;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.csp.awsIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color={'subdued'} size="s">
        <FormattedMessage
          id="xpack.csp.awsIntegration.setupInfoContent"
          defaultMessage="The integration will require certain read-only AWS permissions to detect security misconfigurations. Select your preferred method of providing the AWS credentials this integration will use. You can follow these {stepByStepInstructionsLink} to generate the necessary credentials."
          values={{
            stepByStepInstructionsLink: (
              <EuiLink href={integrationLink} target="_blank">
                <FormattedMessage
                  id="xpack.csp.awsIntegration.setupInfoContentLink"
                  defaultMessage="step-by-step instructions"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};

const AssumeRoleDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.assumeRoleDescription"
        defaultMessage="An IAM role Amazon Resource Name (ARN) is an IAM identity that you can create in your AWS
      account. When creating an IAM role, users can define the role’s permissions. Roles do not have
      standard long-term credentials such as passwords or access keys."
      />
    </EuiText>
  </div>
);

const DirectAccessKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.directAccessKeysDescription"
        defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user."
      />
    </EuiText>
  </div>
);

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.temporaryKeysDescription"
        defaultMessage="You can configure temporary security credentials in AWS to last for a specified duration. They
      consist of an access key ID, a secret access key, and a security token, which is typically
      found using GetSessionToken."
      />
    </EuiText>
  </div>
);

const SharedCredentialsDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.awsIntegration.sharedCredentialsDescription"
        defaultMessage="If you use different AWS credentials for different tools or applications, you can use profiles
      to define multiple access keys in the same configuration file."
      />
    </EuiText>
  </div>
);

const AWS_FIELD_LABEL = {
  access_key_id: i18n.translate('xpack.csp.awsIntegration.accessKeyIdLabel', {
    defaultMessage: 'Access Key ID',
  }),
  secret_access_key: i18n.translate('xpack.csp.awsIntegration.secretAccessKeyLabel', {
    defaultMessage: 'Secret Access Key',
  }),
};

type AwsOptions = Record<
  'assume_role' | 'direct_access_keys' | 'temporary_keys' | 'shared_credentials',
  {
    label: string;
    info: React.ReactNode;
    fields: Record<string, { label: string; type?: 'password' | 'text' }>;
  }
>;

const options: AwsOptions = {
  assume_role: {
    label: i18n.translate('xpack.csp.awsIntegration.assumeRoleLabel', {
      defaultMessage: 'Assume role',
    }),
    info: AssumeRoleDescription,
    fields: {
      role_arn: {
        label: i18n.translate('xpack.csp.awsIntegration.roleArnLabel', {
          defaultMessage: 'Role ARN',
        }),
      },
    },
  },
  direct_access_keys: {
    label: i18n.translate('xpack.csp.awsIntegration.directAccessKeyLabel', {
      defaultMessage: 'Direct access keys',
    }),
    info: DirectAccessKeysDescription,
    fields: {
      access_key_id: { label: AWS_FIELD_LABEL.access_key_id },
      secret_access_key: { label: AWS_FIELD_LABEL.secret_access_key, type: 'password' },
    },
  },
  temporary_keys: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.awsIntegration.temporaryKeysLabel', {
      defaultMessage: 'Temporary keys',
    }),
    fields: {
      access_key_id: { label: AWS_FIELD_LABEL.access_key_id },
      secret_access_key: { label: AWS_FIELD_LABEL.secret_access_key, type: 'password' },
      session_token: {
        label: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
          defaultMessage: 'Session Token',
        }),
      },
    },
  },
  shared_credentials: {
    label: i18n.translate('xpack.csp.awsIntegration.sharedCredentialLabel', {
      defaultMessage: 'Shared credentials',
    }),
    info: SharedCredentialsDescription,
    fields: {
      shared_credential_file: {
        label: i18n.translate('xpack.csp.awsIntegration.sharedCredentialFileLabel', {
          defaultMessage: 'Shared Credential File',
        }),
      },
      credential_profile_name: {
        label: i18n.translate('xpack.csp.awsIntegration.credentialProfileNameLabel', {
          defaultMessage: 'Credential Profile Name',
        }),
      },
    },
  },
};

export type AwsCredentialsType = keyof typeof options;
export const DEFAULT_AWS_VARS_GROUP: AwsCredentialsType = 'assume_role';
const AWS_CREDENTIALS_OPTIONS = Object.keys(options).map((value) => ({
  id: value as AwsCredentialsType,
  label: options[value as keyof typeof options].label,
}));

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' | 'cloudbeat/cis_eks' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

const getInputVarsFields = (
  input: NewPackagePolicyInput,
  fields: AwsOptions[keyof AwsOptions]['fields']
) =>
  Object.entries(input.streams[0].vars || {})
    .filter(([id]) => id in fields)
    .map(([id, inputVar]) => {
      const field = fields[id];
      return {
        id,
        label: field.label,
        type: field.type || 'text',
        value: inputVar.value,
      } as const;
    });

const getAwsCredentialsType = (input: Props['input']): AwsCredentialsType | undefined =>
  input.streams[0].vars?.['aws.credentials.type'].value;

export const AwsCredentialsForm = ({ input, newPolicy, updatePolicy }: Props) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value so we default to the first option.
  const awsCredentialsType = getAwsCredentialsType(input) || AWS_CREDENTIALS_OPTIONS[0].id;
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);

  return (
    <>
      <AWSSetupInfoContent policyTemplate={input.policy_template} />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        type={awsCredentialsType}
        onChange={(optionId) =>
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              'aws.credentials.type': { value: optionId },
            })
          )
        }
      />
      <EuiSpacer size="m" />
      {group.info}
      <EuiSpacer size="l" />
      <AwsInputVarFields
        fields={fields}
        onChange={(key, value) =>
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }))
        }
      />
      <EuiSpacer />
    </>
  );
};

const AwsCredentialTypeSelector = ({
  type,
  onChange,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
}) => (
  <RadioGroup
    size="s"
    options={[...AWS_CREDENTIALS_OPTIONS]}
    idSelected={type}
    onChange={(id) => onChange(id as AwsCredentialsType)}
  />
);

const AwsInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<AwsOptions[keyof AwsOptions]['fields'][number] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
}) => (
  <div>
    {fields.map((field) => (
      <EuiFormRow key={field.id} label={field.label} fullWidth hasChildLabel={true} id={field.id}>
        <>
          {field.type === 'password' && (
            <EuiFieldPassword
              id={field.id}
              type="dual"
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
          {field.type === 'text' && (
            <EuiFieldText
              id={field.id}
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
        </>
      </EuiFormRow>
    ))}
  </div>
);
