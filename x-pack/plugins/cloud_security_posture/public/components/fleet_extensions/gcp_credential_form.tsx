/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import semverLt from 'semver/functions/lt';
import semverCoerce from 'semver/functions/coerce';
import semverValid from 'semver/functions/valid';
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

export const CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS = {
  PROJECT_ID: 'project_id_test_id',
  CREDENTIALS_TYPE: 'credentials_type_test_id',
  CREDENTIALS_FILE: 'credentials_file_test_id',
  CREDENTIALS_JSON: 'credentials_json_test_id',
};
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

/* NEED TO FIND THE REAL URL HERE LATER */
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
      label: i18n.translate('xpack.csp.findings.gcpIntegration.gcpInputText.credentialFileText', {
        defaultMessage: 'Path to JSON file containing the credentials and key used to subscribe',
      }),
      type: 'text',
    },
    credentials_json: {
      label: i18n.translate('xpack.csp.findings.gcpIntegration.gcpInputText.credentialJSONText', {
        defaultMessage: 'JSON blob containing the credentials and key used to subscribe',
      }),
      type: 'text',
    },
    credentials_type: {
      label: i18n.translate(
        'xpack.csp.findings.gcpIntegration.gcpInputText.credentialSelectBoxTitle',
        { defaultMessage: 'Credential' }
      ),
      type: 'text',
    },
  },
};

const credentialOptionsList = [
  {
    text: i18n.translate('xpack.csp.gcpIntegration.credentialsFileOption', {
      defaultMessage: 'Credentials File',
    }),
    value: 'credentials-file',
  },
  {
    text: i18n.translate('xpack.csp.gcpIntegration.credentialsJsonOption', {
      defaultMessage: 'Credentials JSON',
    }),
    value: 'credentials-json',
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

interface GcpFormProps {
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
}: GcpFormProps) => {
  const fields = getInputVarsFields(input, gcpField.fields);
  const validSemantic = semverValid(packageInfo.version);
  const integrationVersionNumberOnly = semverCoerce(validSemantic) || '';
  const isInvalid = semverLt(integrationVersionNumberOnly, MIN_VERSION_GCP_CIS);
  useEffect(() => {
    setIsValid(!isInvalid);

    onChange({
      isValid: !isInvalid,
      updatedPolicy: newPolicy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, packageInfo]);

  if (isInvalid) {
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
  const getFieldById = (id: keyof GcpInputFields['fields']) => {
    return fields.find((element) => element.id === id);
  };
  const projectIdFields = getFieldById('project_id');
  const credentialsTypeFields = getFieldById('credentials_type');
  const credentialFilesFields = getFieldById('credentials_file');
  const credentialJSONFields = getFieldById('credentials_json');
  const credentialsTypeField = {
    id: 'credentials_type',
    label: 'Credentials Type',
    type: 'text',
    value: credentialsTypeFields || credentialOptionsList[0].value,
  };
  const credentialFieldValue = credentialOptionsList[0].value;
  const credentialJSONValue = credentialOptionsList[1].value;

  return (
    <div>
      <EuiForm component="form">
        {projectIdFields && (
          <EuiFormRow fullWidth label={gcpField.fields.project_id.label}>
            <EuiFieldText
              data-test-subj={CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID}
              id={projectIdFields.id}
              fullWidth
              value={projectIdFields.value || ''}
              onChange={(event) => onChange(projectIdFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
        {credentialFilesFields && credentialJSONFields && (
          <EuiFormRow fullWidth label={gcpField.fields.credentials_type.label}>
            <EuiSelect
              data-test-subj={CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_TYPE}
              fullWidth
              options={credentialOptionsList}
              value={credentialsTypeFields?.value}
              onChange={(optionElem) => {
                onChange(credentialsTypeField.id, optionElem.target.value);
              }}
            />
          </EuiFormRow>
        )}

        {(credentialsTypeFields?.value || credentialsTypeField.value) === credentialFieldValue &&
          credentialFilesFields && (
            <EuiFormRow fullWidth label={gcpField.fields.credentials_file.label}>
              <EuiFieldText
                data-test-subj={CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_FILE}
                id={credentialFilesFields.id}
                fullWidth
                value={credentialFilesFields.value || ''}
                onChange={(event) => onChange(credentialFilesFields.id, event.target.value)}
              />
            </EuiFormRow>
          )}
        {credentialsTypeFields?.value === credentialJSONValue && credentialJSONFields && (
          <EuiFormRow fullWidth label={gcpField.fields.credentials_json.label}>
            <EuiTextArea
              data-test-subj={CIS_GCP_INPUT_FIELDS_TEST_SUBJECTS.CREDENTIALS_JSON}
              id={credentialJSONFields.id}
              fullWidth
              value={credentialJSONFields.value || ''}
              onChange={(event) => onChange(credentialJSONFields.id, event.target.value)}
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </div>
  );
};
/*

*/
