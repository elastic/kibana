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
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { InlineRadioGroup } from './inline_radio_group';
import { getPolicyWithInputVars, NewPackagePolicyPostureInput } from './utils';

const DocsLink = (
  <EuiText color={'subdued'} size="s">
    <FormattedMessage
      id="xpack.csp.awsIntegration.docsLink"
      defaultMessage="Read the {docs} for more details"
      values={{
        docs: (
          <EuiLink
            href="https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html"
            external
          >
            documentation
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);

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
    <EuiSpacer />
    {DocsLink}
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
    <EuiSpacer />
    {DocsLink}
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
    <EuiSpacer />
    {DocsLink}
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
    <EuiSpacer />
    {DocsLink}
  </div>
);

/**
 * The fields for each AWS Credentials group type
 */
const AWS_FIELDS = {
  assume_role: ['role_arn'],
  direct_access_keys: ['access_key_id', 'secret_access_key'],
  temporary_keys: ['access_key_id', 'secret_access_key', 'session_token'],
  shared_credentials: ['shared_credential_file', 'credential_profile_name'],
} as const;

const AWS_SECRET_FIELDS = ['secret_access_key'] as const;

type Fields = typeof AWS_FIELDS;

/**
 * The info for each AWS Credentials group type
 */
const AWS_VARS_INFO: Record<keyof Fields, JSX.Element> = {
  assume_role: AssumeRoleDescription,
  direct_access_keys: DirectAccessKeysDescription,
  temporary_keys: TemporaryKeysDescription,
  shared_credentials: SharedCredentialsDescription,
};

/**
 * The labels for each AWS Credentials field
 */
const AWS_FIELD_LABEL: Record<Fields[keyof Fields][number], string> = {
  role_arn: i18n.translate('xpack.csp.awsIntegration.roleArnLabel', {
    defaultMessage: 'Role ARN',
  }),
  access_key_id: i18n.translate('xpack.csp.awsIntegration.accessKeyIdLabel', {
    defaultMessage: 'Access Key ID',
  }),
  secret_access_key: i18n.translate('xpack.csp.awsIntegration.secretAccessKeyLabel', {
    defaultMessage: 'Secret Access Key',
  }),
  session_token: i18n.translate('xpack.csp.awsIntegration.sessionTokenLabel', {
    defaultMessage: 'Session Token',
  }),
  shared_credential_file: i18n.translate('xpack.csp.awsIntegration.sharedCredentialFileLabel', {
    defaultMessage: 'Shared Credential File',
  }),
  credential_profile_name: i18n.translate('xpack.csp.awsIntegration.credentialProfileNameLabel', {
    defaultMessage: 'Credential Profile Name',
  }),
};

/**
 * The options for the AWS credentials group type
 */
const AWS_CREDENTIALS_OPTIONS: ReadonlyArray<{
  id: keyof Fields;
  label: string;
}> = [
  { id: 'assume_role', label: 'Assume role' },
  { id: 'direct_access_keys', label: 'Direct access keys' },
  { id: 'temporary_keys', label: 'Temporary keys' },
  { id: 'shared_credentials', label: 'Shared credentials' },
];

type AwsCredentialsType = typeof AWS_CREDENTIALS_OPTIONS[number]['id'];
const DEFAULT_AWS_VARS_GROUP: AwsCredentialsType = 'assume_role';

interface Props {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyPostureInput;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

const getAwsCredentialVars = (input: NewPackagePolicyInput, fields: readonly string[]) =>
  Object.fromEntries(
    Object.entries(input.streams[0].vars || {}).filter(([k]) => fields.includes(k))
  );

const getDefaultAwsType = (input: Props['input']): AwsCredentialsType =>
  input?.streams[0].vars?.['aws.credentials.type']?.value || DEFAULT_AWS_VARS_GROUP;

export const AwsCredentialsForm = ({ input, newPolicy, updatePolicy }: Props) => {
  const awsCredentialsType = getDefaultAwsType(input);
  const awsCredentialVars = getAwsCredentialVars(input, AWS_FIELDS[awsCredentialsType] || []);
  const awsCredentialVarsKeys = Object.keys(awsCredentialVars) as Array<
    Fields[keyof Fields][number]
  >;

  return (
    <>
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        type={awsCredentialsType}
        onChange={(optionId) => {
          let policy = getPolicyWithInputVars(newPolicy, 'aws.credentials.type', optionId);

          // reset all form group values when changing group
          awsCredentialVarsKeys.forEach((key) => {
            policy = getPolicyWithInputVars(policy, key, '');
          });

          updatePolicy(policy);
        }}
      />
      <EuiSpacer size="m" />
      {AWS_VARS_INFO[awsCredentialsType]}
      <EuiSpacer />
      <AwsInputVarFields
        onChange={(key, value) => updatePolicy(getPolicyWithInputVars(newPolicy, key, value))}
        fields={awsCredentialVarsKeys.map((field) => ({
          id: field,
          value: awsCredentialVars[field].value,
          label: AWS_FIELD_LABEL[field],
        }))}
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
  <InlineRadioGroup
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
  fields: Array<{ label: string; id: string; value: string }>;
  onChange: (key: string, value: string) => void;
}) => (
  <div>
    {fields.map((field) => (
      <EuiFormRow key={field.id} label={field.label} fullWidth>
        {AWS_SECRET_FIELDS.includes(field.id as typeof AWS_SECRET_FIELDS[number]) ? (
          <EuiFieldPassword
            type="dual"
            fullWidth
            value={field.value || ''}
            onChange={(event) => onChange(field.id, event.target.value)}
          />
        ) : (
          <EuiFieldText
            fullWidth
            value={field.value || ''}
            onChange={(event) => onChange(field.id, event.target.value)}
          />
        )}
      </EuiFormRow>
    ))}
  </div>
);
