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
  EuiSelect,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RadioGroup } from './csp_boxed_radio_group';
import { getPosturePolicy, NewPackagePolicyPostureInput } from './utils';

type SetupFormatGCP = 'google_cloud_shell' | 'manual';
const GCPSetupInfoContent = () => (
  <>
    <EuiSpacer size="l" />
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="xpack.csp.gcpIntegration.setupInfoContentTitle"
          defaultMessage="Setup Access"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="l" />
    <EuiText color={'subdued'} size="s">
      <FormattedMessage
        id="xpack.csp.gcpIntegration.setupInfoContent"
        defaultMessage="The integration will need elevated access to run some CIS benchmark rules. Select your preferred
    method of providing the GCP credentials this integration will use. You can follow these
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

interface GcpFields {
  fields: Record<string, { label: string; type?: 'password' | 'text' }>;
}
const gcpField: GcpFields = {
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

const jsonOptionsHolder = [
  { label: 'Option A', text: 'Option A' },
  { label: 'Option B', text: 'Option B' },
];

const getSetupFormatOptions = (): Array<{
  id: SetupFormatGCP;
  label: string;
  disabled: boolean;
}> => [
  {
    id: 'google_cloud_shell',
    label: 'Google Cloud Shell',
    disabled: true,
  },
  {
    id: 'manual',
    label: i18n.translate('xpack.csp.gcpIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    disabled: false,
  },
];

export type AwsCredentialsType = keyof typeof gcpField;

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<
    NewPackagePolicyPostureInput,
    { type: 'cloudbeat/cis_aws' | 'cloudbeat/cis_eks' | 'cloudbeat/cis_gcp' }
  >;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
}

const getInputVarsFields = (input: NewPackagePolicyInput, fields: GcpFields[keyof GcpFields]) =>
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

export const GcpCredentialsForm = ({ input, newPolicy, updatePolicy }: Props) => {
  // We only have a value for 'aws.credentials.type' once the form has mounted.
  // On initial render we don't have that value so we default to the first option.
  // const awsCredentialsType = getAwsCredentialsType(input) || AWS_CREDENTIALS_OPTIONS[0].id;
  //   const group = gcpField;
  const fields = getInputVarsFields(input, gcpField.fields);

  return (
    <>
      <GCPSetupInfoContent />
      <EuiSpacer size="l" />
      <GcpSetupAccessSelector
        onChange={(optionId) =>
          updatePolicy(
            getPosturePolicy(newPolicy, input.type, {
              'aws.credentials.type': { value: optionId },
            })
          )
        }
      />
      <EuiSpacer size="l" />
      <GcpInputVarFields
        fields={fields}
        onChange={(key, value) =>
          updatePolicy(getPosturePolicy(newPolicy, input.type, { [key]: { value } }))
        }
      />
      <EuiSpacer size="s" />
      {DocsLink}
      <EuiSpacer />
    </>
  );
};

const GcpSetupAccessSelector = ({ onChange }: { onChange(type: AwsCredentialsType): void }) => (
  <RadioGroup
    size="s"
    options={getSetupFormatOptions()}
    idSelected={'manual'}
    onChange={(id) => onChange(id as AwsCredentialsType)}
  />
);

const GcpInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<GcpFields[keyof GcpFields]['fields'] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
}) => (
  <div>
    {fields.map((field) => (
      <EuiFormRow key={field.id} label={field.label} fullWidth hasChildLabel={true} id={field.id}>
        <>
          {field.id === 'credentials_file' && (
            // <EuiComboBox
            //   id={field.id}
            //   placeholder="Select Credentials File"
            //   singleSelection={{ asPlainText: true }}
            //   options={jsonOptionsHolder}
            //   isClearable={false}
            //   fullWidth
            //   selectedOptions={jsonOptionsHolder.filter((o) => o.label === field.value)}
            //   onChange={(event) => onChange(field.id, event[0].label)}
            // />
            <EuiSelect
              fullWidth
              options={jsonOptionsHolder}
              value={field.value || ''}
              onChange={(optionElem) => {
                onChange(field.id, optionElem.target.value);
              }}
            />
          )}
          {field.type === 'password' && (
            <EuiFieldPassword
              id={field.id}
              type="dual"
              fullWidth
              value={field.value || ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
          {field.type === 'text' && field.id !== 'credentials_file' && (
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
