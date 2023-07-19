/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiSelect,
  EuiForm,
  EuiCallOut,
  EuiTextArea,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { RadioGroup } from './csp_boxed_radio_group';
import { getPosturePolicy, NewPackagePolicyPostureInput } from './utils';
import { MIN_VERSION_GCP_CIS } from '../../common/constants';

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

/* NEED TO FIND THE REAL URL HERE LATER*/
const DocsLink = (
  <EuiText color={'subdued'} size="s">
    <FormattedMessage
      id="xpack.csp.gcpIntegration.docsLink"
      defaultMessage="Read the {docs} for more details"
      values={{
        docs: (
          <EuiLink href="https://cloud.google.com/docs/authentication" external>
            documentation
          </EuiLink>
        ),
      }}
    />
  </EuiText>
);

const CredentialFileText = i18n.translate(
  'xpack.csp.findings.gcpIntegration.gcpInputText.credentialFileText',
  { defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe' }
);
const CredentialJSONText = i18n.translate(
  'xpack.csp.findings.gcpIntegration.gcpInputText.credentialJSONText',
  { defaultMessage: 'JSON blob containing the credentials and key used to subscribe' }
);

type GcpCredentialsType = 'credentials_file' | 'credentials_json';
type GcpFields = Record<string, { label: string; type?: 'password' | 'text' }>;
interface GcpInputFields {
  fields: GcpFields;
}

const gcpField: GcpInputFields = {
  fields: {
    project_id: {
      label: i18n.translate('xpack.csp.gcpIntegration.projectidFieldLabel', {
        defaultMessage: 'Project ID',
      }),
      type: 'text',
    },
    credentials_file: {
      label: i18n.translate('xpack.csp.gcpIntegration.credentialsFileFieldLabel', {
        defaultMessage: 'Credentials File',
      }),
      type: 'text',
    },
    credentials_json: {
      label: i18n.translate('xpack.csp.gcpIntegration.credentialsJSONFieldLabel', {
        defaultMessage: 'Credentials JSON',
      }),
      type: 'text',
    },
  },
};

const credentialOptionsList = [
  {
    label: i18n.translate('xpack.csp.gcpIntegration.credentialsFileOption', {
      defaultMessage: 'Credentials File',
    }),
    text: 'Credentials File',
  },
  {
    label: i18n.translate('xpack.csp.gcpIntegration.credentialsjsonOption', {
      defaultMessage: 'Credentials JSON',
    }),
    text: 'Credentials JSON',
  },
];

const getSetupFormatOptions = (): Array<{
  id: SetupFormatGCP;
  label: string;
  disabled: boolean;
}> => [
  {
    id: 'google_cloud_shell',
    label: i18n.translate('xpack.csp.gcpIntegration.setupFormatOptions.googleCloudShell', {
      defaultMessage: 'Google Cloud Shell',
    }),
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

interface Props {
  newPolicy: NewPackagePolicy;
  input: Extract<
    NewPackagePolicyPostureInput,
    { type: 'cloudbeat/cis_aws' | 'cloudbeat/cis_eks' | 'cloudbeat/cis_gcp' }
  >;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  setIsValid: (isValid: boolean) => void;
  onChange: any;
}

const getInputVarsFields = (
  input: NewPackagePolicyInput,
  fields: GcpInputFields[keyof GcpInputFields]
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

export const GcpCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  setIsValid,
  onChange,
}: Props) => {
  const fields = getInputVarsFields(input, gcpField.fields);

  useEffect(() => {
    const isInvalid = packageInfo.version < MIN_VERSION_GCP_CIS;

    setIsValid(!isInvalid);

    onChange({
      isValid: !isInvalid,
      updatedPolicy: newPolicy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, packageInfo]);

  if (packageInfo.version < MIN_VERSION_GCP_CIS) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiCallOut color="warning">
          <FormattedMessage
            id="xpack.csp.gcpIntegration.gcpNotSupportedMessage"
            defaultMessage="CIS GCP is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS GCP"
          />
        </EuiCallOut>
      </>
    );
  }
  return (
    <>
      <GCPSetupInfoContent />
      <EuiSpacer size="l" />
      <GcpSetupAccessSelector
        onChange={(optionId) => updatePolicy(getPosturePolicy(newPolicy, input.type))}
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

const GcpSetupAccessSelector = ({ onChange }: { onChange(type: GcpCredentialsType): void }) => (
  <RadioGroup
    size="s"
    options={getSetupFormatOptions()}
    idSelected={'manual'}
    onChange={(id: GcpCredentialsType) => onChange(id)}
  />
);

const GcpInputVarFields = ({
  fields,
  onChange,
}: {
  fields: Array<GcpFields[keyof GcpFields] & { value: string; id: string }>;
  onChange: (key: string, value: string) => void;
}) => {
  const [credentialOption, setCredentialOption] = useState('Credentials File');
  const targetFieldName = (id: string) => {
    return fields.find((element) => element.id === id);
  };
  return (
    <div>
      <EuiForm component="form">
        <EuiFormRow fullWidth label={gcpField.fields.project_id.label}>
          <EuiFieldText
            id={targetFieldName('project_id')!.id}
            fullWidth
            value={targetFieldName('project_id')!.value || ''}
            onChange={(event) => onChange(targetFieldName('project_id')!.id, event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow fullWidth label={'Credentials'}>
          <EuiSelect
            fullWidth
            options={credentialOptionsList}
            value={credentialOption}
            onChange={(optionElem) => {
              setCredentialOption(optionElem.target.value);
            }}
          />
        </EuiFormRow>
        {credentialOption === 'Credentials File' && (
          <EuiFormRow fullWidth label={CredentialFileText}>
            <EuiFieldText
              id={targetFieldName('credentials_file')!.id}
              fullWidth
              value={targetFieldName('credentials_file')!.value || ''}
              onChange={(event) =>
                onChange(targetFieldName('credentials_file')!.id, event.target.value)
              }
            />
          </EuiFormRow>
        )}
        {credentialOption === 'Credentials JSON' && (
          <EuiFormRow fullWidth label={CredentialJSONText}>
            <EuiTextArea
              id={targetFieldName('credentials_json')!.id}
              fullWidth
              value={targetFieldName('credentials_json')!.value || ''}
              onChange={(event) =>
                onChange(targetFieldName('credentials_json')!.id, event.target.value)
              }
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </div>
  );
};
