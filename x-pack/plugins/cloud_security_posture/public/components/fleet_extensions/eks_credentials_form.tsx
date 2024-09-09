/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RadioGroup } from './csp_boxed_radio_group';
import { getPosturePolicy, NewPackagePolicyPostureInput } from './utils';
import { AwsInputVarFields } from './aws_credentials_form/aws_input_var_fields';

const AWSSetupInfoContent = () => (
  <>
    <EuiHorizontalRule margin="xl" />
    <EuiTitle size="xs">
      <h2>
        <FormattedMessage
          id="xpack.csp.eksIntegration.setupInfoContentTitle"
          defaultMessage="Setup Access"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.eksIntegration.setupInfoContent"
        defaultMessage="The integration will need elevated access to run some CIS benchmark rules. Select your preferred
    method of providing the AWS credentials this integration will use. You can follow these
    step-by-step instructions to generate the necessary credentials."
      />
    </EuiText>
  </>
);

const DocsLink = (
  <EuiText color={'subdued'} size="s">
    <FormattedMessage
      id="xpack.csp.eksIntegration.docsLink"
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
        id="xpack.csp.eksIntegration.assumeRoleDescription"
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
        id="xpack.csp.eksIntegration.directAccessKeysDescription"
        defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user."
      />
    </EuiText>
  </div>
);

const TemporaryKeysDescription = (
  <div>
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.eksIntegration.temporaryKeysDescription"
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
        id="xpack.csp.eksIntegration.sharedCredentialsDescription"
        defaultMessage="If you use different AWS credentials for different tools or applications, you can use profiles
      to define multiple access keys in the same configuration file."
      />
    </EuiText>
  </div>
);

const AWS_FIELD_LABEL = {
  access_key_id: i18n.translate('xpack.csp.eksIntegration.accessKeyIdLabel', {
    defaultMessage: 'Access Key ID',
  }),
  secret_access_key: i18n.translate('xpack.csp.eksIntegration.secretAccessKeyLabel', {
    defaultMessage: 'Secret Access Key',
  }),
};

type AwsOptions = Record<
  'assume_role' | 'direct_access_keys' | 'temporary_keys' | 'shared_credentials',
  {
    label: string;
    info: React.ReactNode;
    fields: Record<
      string,
      { label: string; type?: 'password' | 'text'; isSecret?: boolean; dataTestSubj: string }
    >;
    testId: string;
  }
>;

const options: AwsOptions = {
  assume_role: {
    label: i18n.translate('xpack.csp.eksIntegration.assumeRoleLabel', {
      defaultMessage: 'Assume role',
    }),
    info: AssumeRoleDescription,
    fields: {
      role_arn: {
        label: i18n.translate('xpack.csp.eksIntegration.roleArnLabel', {
          defaultMessage: 'Role ARN',
        }),
        dataTestSubj: 'roleArnInput',
      },
    },
    testId: 'assumeRoleTestId',
  },
  direct_access_keys: {
    label: i18n.translate('xpack.csp.eksIntegration.directAccessKeyLabel', {
      defaultMessage: 'Direct access keys',
    }),
    info: DirectAccessKeysDescription,
    fields: {
      access_key_id: { label: AWS_FIELD_LABEL.access_key_id, dataTestSubj: 'directAccessKeyId' },
      secret_access_key: {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'directAccessSecretKey',
        isSecret: true,
      },
    },
    testId: 'directAccessKeyTestId',
  },
  temporary_keys: {
    info: TemporaryKeysDescription,
    label: i18n.translate('xpack.csp.eksIntegration.temporaryKeysLabel', {
      defaultMessage: 'Temporary keys',
    }),
    fields: {
      access_key_id: {
        label: AWS_FIELD_LABEL.access_key_id,
        dataTestSubj: 'temporaryKeysAccessKeyId',
      },
      secret_access_key: {
        label: AWS_FIELD_LABEL.secret_access_key,
        type: 'password',
        dataTestSubj: 'temporaryKeysSecretAccessKey',
        isSecret: true,
      },
      session_token: {
        label: i18n.translate('xpack.csp.eksIntegration.sessionTokenLabel', {
          defaultMessage: 'Session Token',
        }),
        dataTestSubj: 'temporaryKeysSessionToken',
      },
    },
    testId: 'temporaryKeyTestId',
  },
  shared_credentials: {
    label: i18n.translate('xpack.csp.eksIntegration.sharedCredentialLabel', {
      defaultMessage: 'Shared credentials',
    }),
    info: SharedCredentialsDescription,
    fields: {
      shared_credential_file: {
        label: i18n.translate('xpack.csp.eksIntegration.sharedCredentialFileLabel', {
          defaultMessage: 'Shared Credential File',
        }),
        dataTestSubj: 'sharedCredentialFile',
      },
      credential_profile_name: {
        label: i18n.translate('xpack.csp.eksIntegration.credentialProfileNameLabel', {
          defaultMessage: 'Credential Profile Name',
        }),
        dataTestSubj: 'credentialProfileName',
      },
    },
    testId: 'sharedCredentialsTestId',
  },
};

export type AwsCredentialsType = keyof typeof options;
export const DEFAULT_EKS_VARS_GROUP: AwsCredentialsType = 'assume_role';
const AWS_CREDENTIALS_OPTIONS = Object.keys(options).map((value) => ({
  id: value as AwsCredentialsType,
  label: options[value as keyof typeof options].label,
  testId: options[value as keyof typeof options].testId,
}));

interface Props {
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
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
        dataTestSubj: field.dataTestSubj,
        value: inputVar.value,
        isSecret: field?.isSecret,
      } as const;
    });

const getAwsCredentialsType = (input: Props['input']): AwsCredentialsType | undefined =>
  input.streams[0].vars?.['aws.credentials.type'].value;

export const EksCredentialsForm = ({ input, newPolicy, packageInfo, updatePolicy }: Props) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value so we default to the first option.
  const awsCredentialsType = getAwsCredentialsType(input) || AWS_CREDENTIALS_OPTIONS[0].id;
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);

  return (
    <>
      <AWSSetupInfoContent />
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
      <EuiSpacer size="s" />
      {DocsLink}
      <EuiSpacer />
      <AwsInputVarFields
        fields={fields}
        packageInfo={packageInfo}
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
