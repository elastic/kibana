/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiFormFieldset,
  EuiSelect,
  EuiScreenReaderOnly,
  EuiSpacer,
} from '@elastic/eui';

import { OptionalLabel } from './optional_label';

import { VerificationMode, ConfigKeys, ITLSFields, TLSVersion } from './types';

export enum SSLRole {
  CLIENT = 'client',
  SERVER = 'server',
}

export const CertsField: React.FunctionComponent<{
  defaultValues: ITLSFields;
  isEnabled: boolean;
  onChange: (newValue: any) => void;
  sslRole: SSLRole;
}> = memo(({ defaultValues, isEnabled, onChange, sslRole = SSLRole.CLIENT }) => {
  const [fields, setFields] = useState<ITLSFields>(defaultValues);
  const [
    verificationVersionInputRef,
    setVerificationVersionInputRef,
  ] = useState<HTMLInputElement | null>(null);
  const [hasVerificationVersionError, setHasVerificationVersionError] = useState<
    string | undefined
  >(undefined);
  useDebounce(
    () => {
      onChange(fields);
    },
    250,
    [onChange, fields]
  );

  useEffect(() => {
    setFields((prevFields) => ({
      [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
        value: prevFields[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value,
        isEnabled,
      },
      [ConfigKeys.TLS_CERTIFICATE]: {
        value: prevFields[ConfigKeys.TLS_CERTIFICATE].value,
        isEnabled,
      },
      [ConfigKeys.TLS_KEY]: {
        value: prevFields[ConfigKeys.TLS_KEY].value,
        isEnabled,
      },
      [ConfigKeys.TLS_KEY_PASSPHRASE]: {
        value: prevFields[ConfigKeys.TLS_KEY_PASSPHRASE].value,
        isEnabled,
      },
      [ConfigKeys.TLS_VERIFICATION_MODE]: {
        value: prevFields[ConfigKeys.TLS_VERIFICATION_MODE].value,
        isEnabled,
      },
      [ConfigKeys.TLS_VERSION]: {
        value: prevFields[ConfigKeys.TLS_VERSION].value,
        isEnabled,
      },
    }));
  }, [isEnabled]);

  const onVerificationVersionChange = (
    selectedVersionOptions: Array<EuiComboBoxOptionOption<TLSVersion>>
  ) => {
    setFields((prevFields) => ({
      ...prevFields,
      [ConfigKeys.TLS_VERSION]: {
        value: selectedVersionOptions.map((option) => option.label as TLSVersion),
        isEnabled: true,
      },
    }));
    setHasVerificationVersionError(undefined);
  };

  const onSearchChange = (value: string, hasMatchingOptions?: boolean) => {
    setHasVerificationVersionError(
      value.length === 0 || hasMatchingOptions ? undefined : `"${value}" is not a valid option`
    );
  };

  const onBlur = () => {
    if (verificationVersionInputRef) {
      const { value } = verificationVersionInputRef;
      setHasVerificationVersionError(
        value.length === 0 ? undefined : `"${value}" is not a valid option`
      );
    }
  };

  return isEnabled ? (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiScreenReaderOnly>
            <span>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.certsField.legend"
                defaultMessage="Certificate settings"
              />
            </span>
          </EuiScreenReaderOnly>
        ),
      }}
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.label"
            defaultMessage="Verification mode"
          />
        }
        helpText={
          <ReactMarkdown
            source={verificationModeHelpText[fields[ConfigKeys.TLS_VERIFICATION_MODE].value]}
          />
        }
      >
        <EuiSelect
          options={verificationModeOptions}
          value={fields[ConfigKeys.TLS_VERIFICATION_MODE].value}
          onChange={(event) => {
            const value = event.target.value as VerificationMode;
            setFields((prevFields) => ({
              ...prevFields,
              [ConfigKeys.TLS_VERIFICATION_MODE]: {
                value,
                isEnabled: true,
              },
            }));
          }}
        />
      </EuiFormRow>
      {fields[ConfigKeys.TLS_VERIFICATION_MODE].value === VerificationMode.NONE && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.warning.title"
                defaultMessage="Disabling TLS"
              />
            }
            color="warning"
            size="s"
          >
            <p>
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.warning.description"
                defaultMessage="This mode disables many of the security benefits of SSL/TLS and should only be used
                  after cautious consideration."
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.version.label"
            defaultMessage="Supported TLS protocols"
          />
        }
        error={hasVerificationVersionError}
        isInvalid={hasVerificationVersionError !== undefined}
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.certsField.version.placeholder',
            {
              defaultMessage: 'Select one or more TLS protocols.',
            }
          )}
          options={tlsVersionOptions}
          selectedOptions={fields[ConfigKeys.TLS_VERSION].value.map((version: TLSVersion) => ({
            label: version,
          }))}
          inputRef={setVerificationVersionInputRef}
          onChange={onVerificationVersionChange}
          onSearchChange={onSearchChange}
          onBlur={onBlur}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateAuthorities.label"
            defaultMessage="Certificate authorities"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateAuthorities.helpText"
            defaultMessage="Custom certificate authorities."
          />
        }
        labelAppend={<OptionalLabel />}
      >
        <EuiTextArea
          value={fields[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES].value}
          onChange={(event) => {
            const value = event.target.value;
            setFields((prevFields) => ({
              ...prevFields,
              [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]: {
                value,
                isEnabled: true,
              },
            }));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <>
            {sslRoleLabels[sslRole]}{' '}
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificate.label"
              defaultMessage="certificate"
            />
          </>
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificate.helpText"
            defaultMessage="Certificate for SSL client authentication."
          />
        }
        labelAppend={<OptionalLabel />}
      >
        <EuiTextArea
          value={fields[ConfigKeys.TLS_CERTIFICATE].value}
          onChange={(event) => {
            const value = event.target.value;
            setFields((prevFields) => ({
              ...prevFields,
              [ConfigKeys.TLS_CERTIFICATE]: {
                value,
                isEnabled: true,
              },
            }));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <>
            {sslRoleLabels[sslRole]}{' '}
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKey.label"
              defaultMessage="key"
            />
          </>
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKey.helpText"
            defaultMessage="Certificate key for SSL client authentication."
          />
        }
        labelAppend={<OptionalLabel />}
      >
        <EuiTextArea
          value={fields[ConfigKeys.TLS_KEY].value}
          onChange={(event) => {
            const value = event.target.value;
            setFields((prevFields) => ({
              ...prevFields,
              [ConfigKeys.TLS_KEY]: {
                value,
                isEnabled: true,
              },
            }));
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={
          <>
            {sslRoleLabels[sslRole]}{' '}
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKeyPassphrase.label"
              defaultMessage="key passphrase"
            />
          </>
        }
        helpText={
          <FormattedMessage
            id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKeyPassphrase.helpText"
            defaultMessage="Certificate key passphrase for SSL client authentication."
          />
        }
        labelAppend={<OptionalLabel />}
      >
        <EuiFieldText
          value={fields[ConfigKeys.TLS_KEY_PASSPHRASE].value}
          onChange={(event) => {
            const value = event.target.value;
            setFields((prevFields) => ({
              ...prevFields,
              [ConfigKeys.TLS_KEY_PASSPHRASE]: {
                value,
                isEnabled: true,
              },
            }));
          }}
        />
      </EuiFormRow>
    </EuiFormFieldset>
  ) : null;
});

const sslRoleLabels = {
  [SSLRole.CLIENT]: (
    <FormattedMessage
      id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.sslRole.client"
      defaultMessage="Client"
    />
  ),
  [SSLRole.SERVER]: (
    <FormattedMessage
      id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.sslRole.server"
      defaultMessage="Server"
    />
  ),
};

const verificationModeHelpText = {
  [VerificationMode.CERTIFICATE]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.certificate.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA), but does not perform any hostname verification.',
    }
  ),
  [VerificationMode.FULL]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.full.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate.',
    }
  ),
  [VerificationMode.NONE]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.none.description',
    {
      defaultMessage:
        'Performs *no verification* of the server’s certificate. It is primarily intended as a temporary diagnostic mechanism when attempting to resolve TLS errors; its use in production environments is strongly discouraged.',
    }
  ),
  [VerificationMode.STRICT]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.strict.description',
    {
      defaultMessage:
        'Verifies that the provided certificate is signed by a trusted authority (CA) and also verifies that the server’s hostname (or IP address) matches the names identified within the certificate. If the Subject Alternative Name is empty, it returns an error.',
    }
  ),
};

const verificationModeLabels = {
  [VerificationMode.CERTIFICATE]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.certificate.label',
    {
      defaultMessage: 'Certificate',
    }
  ),
  [VerificationMode.FULL]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.full.label',
    {
      defaultMessage: 'Full',
    }
  ),
  [VerificationMode.NONE]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.none.label',
    {
      defaultMessage: 'None',
    }
  ),
  [VerificationMode.STRICT]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.certsField.verificationMode.strict.label',
    {
      defaultMessage: 'Strict',
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

const tlsVersionOptions = Object.values(TLSVersion).map((method) => ({
  label: method,
}));
