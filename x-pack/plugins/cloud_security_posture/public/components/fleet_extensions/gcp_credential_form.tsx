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
import { RadioGroup } from './csp_boxed_radio_group';
import { getPosturePolicy, NewPackagePolicyPostureInput } from './utils';

const AWSSetupInfoContent = () => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="s">
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

interface GcpOption {
  fields: Record<string, { label: string; type?: 'password' | 'text' }>;
}
const options: GcpOption = {
  fields: {
    project_id: {
      label: i18n.translate('xpack.csp.gcpIntegration.projectidLabel', {
        defaultMessage: 'Project ID',
      }),
    },
    credentials_file: {
      label: i18n.translate('xpack.csp.gcpIntegration.credentialsLabel', {
        defaultMessage: 'Credentials File',
      }),
    },
    credentials_json: {
      label: i18n.translate('xpack.csp.gcpIntegration.credentialsjsonLabel', {
        defaultMessage: 'Credentials JSON',
      }),
    },
  },
};

const varsFake = {
  project_id: {
    value: 'ALPHA',
    type: 'text',
  },
  credentials_file: {
    value: 'BETA',
    type: 'text',
  },
  credentials_json: {
    value: 'GAMMA',
    type: 'text',
  },
};

export type AwsCredentialsType = keyof typeof options;
export const DEFAULT_EKS_VARS_GROUP: AwsCredentialsType = 'assume_role';
const AWS_CREDENTIALS_OPTIONS = Object.keys(options).map((value) => ({
  id: value as AwsCredentialsType,
  label: options[value as keyof typeof options].label,
}));

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<
    NewPackagePolicyPostureInput,
    { type: 'cloudbeat/cis_aws' | 'cloudbeat/cis_eks' | 'cloudbeat/cis_gcp' }
  >;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

const getInputVarsFields = (input: NewPackagePolicyInput, fields: GcpOption[keyof GcpOption]) =>
  Object.entries(/*input.streams[0].vars*/ varsFake|| {})
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

export const GcpCredentialsForm = ({ input, newPolicy, updatePolicy }: Props) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value so we default to the first option.
  // const awsCredentialsType = getAwsCredentialsType(input) || AWS_CREDENTIALS_OPTIONS[0].id;
  const group = options;
  console.log('group', group);
  console.log('group fields', group.fields);
  console.log('INPUT', input);
  const fields = getInputVarsFields(input, group.fields);
  console.log('fields', fields);

  return (
    <>
      <AWSSetupInfoContent />
      <EuiSpacer size="l" />
      GCP ADD HERE
      <GcpInputVarFields
        fields={fields}
        onChange={(key, value) =>
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }))
        }
      />
      <EuiSpacer />
    </>
  );
};

// const AwsCredentialTypeSelector = ({
//   type,
//   onChange,
// }: {
//   onChange(type: AwsCredentialsType): void;
//   type: AwsCredentialsType;
// }) => (
//   <RadioGroup
//     size="s"
//     options={[...AWS_CREDENTIALS_OPTIONS]}
//     idSelected={type}
//     onChange={(id) => onChange(id as AwsCredentialsType)}
//   />
// );

const GcpInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<GcpOption[keyof GcpOption]['fields'] & { value: string; id: string }>;
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

