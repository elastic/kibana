/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiText,
  EuiFieldText,
  EuiTextArea,
  EuiFormFieldset,
  EuiSelect,
  EuiScreenReaderOnly,
  EuiSpacer,
} from '@elastic/eui';

export enum VerificationMode {
  CERTIFICATE = 'certificate',
  FULL = 'full',
  NONE = 'none',
  STRICT = 'strict',
}

export enum SSLRole {
  CLIENT = 'client',
  SERVER = 'server',
}

export enum FieldKey {
  CERTIFICATE = 'certificate',
  CERTIFICATE_AUTHORITIES = 'certificateAuthorities',
  KEY = 'key',
  KEY_PASSPHRASE = 'keyPassphrase',
  VERIFICATION_MODE = 'verificationMode',
}

interface Fields {
  [FieldKey.CERTIFICATE]: string;
  [FieldKey.CERTIFICATE_AUTHORITIES]: string;
  [FieldKey.KEY]: string;
  [FieldKey.KEY_PASSPHRASE]: string;
  [FieldKey.VERIFICATION_MODE]: VerificationMode;
}

interface Config {
  error?: string;
  isInvalid?: boolean;
  isOptional?: boolean;
  helpText?: string;
}

export type FieldConfig = Record<FieldKey, Config>;

const defaultFields = {
  [FieldKey.CERTIFICATE]: '',
  [FieldKey.CERTIFICATE_AUTHORITIES]: '',
  [FieldKey.KEY]: '',
  [FieldKey.KEY_PASSPHRASE]: '',
  [FieldKey.VERIFICATION_MODE]: VerificationMode.FULL,
};

const fieldLabels = {
  [FieldKey.CERTIFICATE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.certificate.label',
    {
      defaultMessage: 'certificate',
    }
  ),
  [FieldKey.CERTIFICATE_AUTHORITIES]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.certificateAuthorities.label',
    {
      defaultMessage: 'Certificate authorities',
    }
  ),
  [FieldKey.KEY]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.key.label',
    {
      defaultMessage: 'key',
    }
  ),
  [FieldKey.KEY_PASSPHRASE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.key.label',
    {
      defaultMessage: 'key passphrase',
    }
  ),
  [FieldKey.VERIFICATION_MODE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.label',
    {
      defaultMessage: 'Verification mode',
    }
  ),
};

const sslRoleLabels = {
  [SSLRole.CLIENT]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.sslRole.client',
    {
      defaultMessage: 'Client',
    }
  ),
  [SSLRole.SERVER]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.sslRole.server',
    {
      defaultMessage: 'Server',
    }
  ),
};

const verificationModeLabels = {
  [VerificationMode.CERTIFICATE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.certificate.label',
    {
      defaultMessage: 'Certificate',
    }
  ),
  [VerificationMode.FULL]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.full.label',
    {
      defaultMessage: 'Full',
    }
  ),
  [VerificationMode.NONE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.none.label',
    {
      defaultMessage: 'None',
    }
  ),
  [VerificationMode.STRICT]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.strict.label',
    {
      defaultMessage: 'Strict',
    }
  ),
};

const verificationModeHelpText = {
  [VerificationMode.CERTIFICATE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.certificate.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA), but does not perform any hostname verification.',
    }
  ),
  [VerificationMode.FULL]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.full.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate.',
    }
  ),
  [VerificationMode.NONE]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.none.description',
    {
      defaultMessage:
        'Performs *no verification* of the server’s certificate. It is primarily intended as a temporary diagnostic mechanism when attempting to resolve TLS errors; its use in production environments is strongly discouraged.',
    }
  ),
  [VerificationMode.STRICT]: i18n.translate(
    'xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.strict.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate. If the Subject Alternative Name is empty, it returns an error.',
    }
  ),
};

const verificationModeOptions = [
  {
    value: VerificationMode.CERTIFICATE,
    text: verificationModeLabels[VerificationMode.CERTIFICATE],
  },
  { value: VerificationMode.FULL, text: verificationModeLabels[VerificationMode.FULL] },
  { value: VerificationMode.NONE, text: verificationModeLabels[VerificationMode.NONE] },
  { value: VerificationMode.STRICT, text: verificationModeLabels[VerificationMode.STRICT] },
];

const defaultLegend = i18n.translate(
  'xpack.fleet.createPackagePolicy.stepConfigure.certsField.legend',
  {
    defaultMessage: 'Certificate settings',
  }
);

const defaultFieldConfig = {
  [FieldKey.CERTIFICATE]: {
    error: '',
    helpText: '',
    isInvalid: false,
    isOptional: true,
  },
  [FieldKey.CERTIFICATE_AUTHORITIES]: {
    error: '',
    helpText: '',
    isInvalid: false,
    isOptional: true,
  },
  [FieldKey.KEY]: {
    error: '',
    helpText: '',
    isInvalid: false,
    isOptional: true,
  },
  [FieldKey.KEY_PASSPHRASE]: {
    error: '',
    helpText: '',
    isInvalid: false,
    isOptional: true,
  },
  [FieldKey.VERIFICATION_MODE]: {
    error: '',
    helpText: '',
    isInvalid: false,
    isOptional: false,
  },
};

export const CertsField: React.FunctionComponent<{
  fieldConfig?: FieldConfig;
  defaultValues?: Fields;
  legend?: string;
  onChange: (newValue: any) => void;
  sslRole: SSLRole;
  showLegend?: boolean;
}> = memo(
  ({
    fieldConfig = defaultFieldConfig,
    defaultValues = defaultFields,
    legend = defaultLegend,
    onChange,
    sslRole = SSLRole.CLIENT,
    showLegend = true,
  }) => {
    const [fields, setFields] = useState<Fields>(defaultValues);
    useDebounce(
      () => {
        onChange(fields);
      },
      250,
      [onChange, fields]
    );

    return (
      <EuiFormFieldset
        legend={{
          children: showLegend ? (
            legend
          ) : (
            <EuiScreenReaderOnly>
              <span>{legend}</span>
            </EuiScreenReaderOnly>
          ),
        }}
      >
        <EuiFormRow
          label={fieldLabels[FieldKey.VERIFICATION_MODE]}
          helpText={
            <ReactMarkdown
              source={
                fieldConfig[FieldKey.VERIFICATION_MODE].helpText ||
                verificationModeHelpText[fields[FieldKey.VERIFICATION_MODE]]
              }
            />
          }
          isInvalid={fieldConfig[FieldKey.VERIFICATION_MODE].isInvalid}
          error={fieldConfig[FieldKey.VERIFICATION_MODE].error}
          labelAppend={
            fieldConfig[FieldKey.VERIFICATION_MODE].isOptional ? <OptionalLabel /> : null
          }
        >
          <EuiSelect
            options={verificationModeOptions}
            value={fields[FieldKey.VERIFICATION_MODE]}
            onChange={(event) => {
              const value = event.target.value as VerificationMode;
              setFields((prevFields) => ({
                ...prevFields,
                [FieldKey.VERIFICATION_MODE]: value,
              }));
            }}
          />
        </EuiFormRow>
        {fields[FieldKey.VERIFICATION_MODE] === VerificationMode.NONE && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title="Proceed with caution!" color="warning" iconType="help" size="s">
              <p>
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.certsField.verificationMode.warning"
                  defaultMessage="This mode disables many of the security benefits of SSL/TLS and should only be used
                  after cautious consideration."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFormRow
          label={fieldLabels[FieldKey.CERTIFICATE_AUTHORITIES]}
          helpText={
            <ReactMarkdown source={fieldConfig[FieldKey.CERTIFICATE_AUTHORITIES].helpText} />
          }
          isInvalid={fieldConfig[FieldKey.CERTIFICATE_AUTHORITIES].isInvalid}
          error={fieldConfig[FieldKey.CERTIFICATE_AUTHORITIES].error}
          labelAppend={
            fieldConfig[FieldKey.CERTIFICATE_AUTHORITIES].isOptional ? <OptionalLabel /> : null
          }
        >
          <EuiTextArea
            value={fields[FieldKey.CERTIFICATE_AUTHORITIES]}
            onChange={(event) => {
              const value = event.target.value;
              setFields((prevFields) => ({
                ...prevFields,
                [FieldKey.CERTIFICATE_AUTHORITIES]: value,
              }));
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={`${sslRoleLabels[sslRole]} ${fieldLabels[FieldKey.CERTIFICATE]}`}
          helpText={<ReactMarkdown source={fieldConfig[FieldKey.CERTIFICATE].helpText} />}
          isInvalid={fieldConfig[FieldKey.CERTIFICATE].isInvalid}
          error={fieldConfig[FieldKey.CERTIFICATE].error}
          labelAppend={fieldConfig[FieldKey.CERTIFICATE].isOptional ? <OptionalLabel /> : null}
        >
          <EuiTextArea
            value={fields[FieldKey.CERTIFICATE]}
            onChange={(event) => {
              const value = event.target.value;
              setFields((prevFields) => ({
                ...prevFields,
                [FieldKey.CERTIFICATE]: value,
              }));
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={`${sslRoleLabels[sslRole]} ${fieldLabels[FieldKey.KEY]}`}
          helpText={<ReactMarkdown source={fieldConfig[FieldKey.KEY].helpText} />}
          isInvalid={fieldConfig[FieldKey.KEY].isInvalid}
          error={fieldConfig[FieldKey.KEY].error}
          labelAppend={fieldConfig[FieldKey.KEY].isOptional ? <OptionalLabel /> : null}
        >
          <EuiTextArea
            value={fields[FieldKey.KEY]}
            onChange={(event) => {
              const value = event.target.value;
              setFields((prevFields) => ({
                ...prevFields,
                [FieldKey.KEY]: value,
              }));
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={`${sslRoleLabels[sslRole]} ${fieldLabels[FieldKey.KEY_PASSPHRASE]}`}
          helpText={<ReactMarkdown source={fieldConfig[FieldKey.KEY_PASSPHRASE].helpText} />}
          isInvalid={fieldConfig[FieldKey.KEY_PASSPHRASE].isInvalid}
          error={fieldConfig[FieldKey.KEY_PASSPHRASE].error}
          labelAppend={fieldConfig[FieldKey.KEY_PASSPHRASE].isOptional ? <OptionalLabel /> : null}
        >
          <EuiFieldText
            value={fields[FieldKey.KEY_PASSPHRASE]}
            onChange={(event) => {
              const value = event.target.value;
              setFields((prevFields) => ({
                ...prevFields,
                [FieldKey.KEY_PASSPHRASE]: value,
              }));
            }}
          />
        </EuiFormRow>
      </EuiFormFieldset>
    );
  }
);

export const OptionalLabel = () => {
  return (
    <EuiText size="xs" color="subdued">
      {i18n.translate('xpack.fleet.createPackagePolicy.stepConfigure.certsField.optionalLabel', {
        defaultMessage: 'Optional',
      })}
    </EuiText>
  );
};
