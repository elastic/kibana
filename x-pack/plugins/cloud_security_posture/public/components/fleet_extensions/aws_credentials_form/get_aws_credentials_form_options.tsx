/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { AwsCredentialsType } from '../../../../common/types_old';

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

export type AwsCredentialsFields = Record<string, { label: string; type?: 'password' | 'text' }>;

export interface AwsOptionValue {
  label: string;
  info: React.ReactNode;
  fields: AwsCredentialsFields;
}

export const getInputVarsFields = (input: NewPackagePolicyInput, fields: AwsCredentialsFields) =>
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

export type AwsOptions = Record<AwsCredentialsType, AwsOptionValue>;
export type AwsCredentialsTypeOptions = Array<{
  value: AwsCredentialsType;
  text: string;
}>;

const getAwsCredentialsTypeSelectorOptions = (
  filterFn: ({ value }: { value: AwsCredentialsType }) => boolean
): AwsCredentialsTypeOptions => {
  return Object.entries(getAwsCredentialsFormOptions())
    .map(([key, value]) => ({
      value: key as AwsCredentialsType,
      text: value.label,
    }))
    .filter(filterFn);
};

export const getAwsCredentialsFormManualOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(({ value }) => value !== 'cloud_formation');

export const getAwsCredentialsFormAgentlessOptions = (): AwsCredentialsTypeOptions =>
  getAwsCredentialsTypeSelectorOptions(
    ({ value }) => value === 'direct_access_keys' || value === 'temporary_keys'
  );

export const DEFAULT_AWS_CREDENTIALS_TYPE = 'cloud_formation';
export const DEFAULT_MANUAL_AWS_CREDENTIALS_TYPE = 'assume_role';
export const DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE = 'direct_access_keys';

export const getAwsCredentialsFormOptions = (): AwsOptions => ({
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
  cloud_formation: {
    label: 'CloudFormation',
    info: [],
    fields: {},
  },
});
