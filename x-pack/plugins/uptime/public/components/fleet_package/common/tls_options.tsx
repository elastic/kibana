/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiTextArea,
  EuiFormFieldset,
  EuiSelect,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiFieldPassword,
} from '@elastic/eui';

import { VerificationMode, TLSVersion } from '../types';

import { OptionalLabel } from '../optional_label';

type TLSRole = 'client' | 'server';

export interface TLSConfig {
  certificateAuthorities?: string;
  certificate?: string;
  key?: string;
  keyPassphrase?: string;
  verificationMode?: VerificationMode;
  version?: TLSVersion[];
}

const defaultConfig = {
  certificateAuthorities: '',
  certificate: '',
  key: '',
  keyPassphrase: '',
  verificationMode: VerificationMode.STRICT,
  version: [],
};

interface Props {
  onChange: (defaultConfig: TLSConfig) => void;
  defaultValues: TLSConfig;
  tlsRole: TLSRole;
}

export const TLSOptions: React.FunctionComponent<Props> = memo(
  ({ onChange, defaultValues = defaultConfig, tlsRole }) => {
    const [verificationVersionInputRef, setVerificationVersionInputRef] =
      useState<HTMLInputElement | null>(null);
    const [hasVerificationVersionError, setHasVerificationVersionError] = useState<
      string | undefined
    >(undefined);

    const [config, setConfig] = useState<TLSConfig>(defaultValues);

    useEffect(() => {
      onChange(config);
    }, [config, onChange]);

    const onVerificationVersionChange = (
      selectedVersionOptions: Array<EuiComboBoxOptionOption<TLSVersion>>
    ) => {
      setConfig((prevConfig) => ({
        ...prevConfig,
        version: selectedVersionOptions.map((option) => option.label as TLSVersion),
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

    return (
      <EuiFormFieldset
        legend={{
          children: (
            <EuiScreenReaderOnly>
              <span>
                <FormattedMessage
                  id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.legend"
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
            config.verificationMode ? verificationModeHelpText[config.verificationMode] : ''
          }
        >
          <EuiSelect
            options={verificationModeOptions}
            value={config.verificationMode}
            onChange={(event) => {
              const verificationMode = event.target.value as VerificationMode;
              setConfig((prevConfig) => ({
                ...prevConfig,
                verificationMode,
              }));
            }}
            data-test-subj="syntheticsTLSVerificationMode"
          />
        </EuiFormRow>
        {config.verificationMode === VerificationMode.NONE && (
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
            selectedOptions={(config.version || []).map((version: TLSVersion) => ({
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
              defaultMessage="PEM formatted custom certificate authorities."
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <EuiTextArea
            value={config.certificateAuthorities}
            onChange={(event) => {
              const certificateAuthorities = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                certificateAuthorities,
              }));
            }}
            onBlur={(event) => {
              const certificateAuthorities = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                certificateAuthorities: certificateAuthorities.trim(),
              }));
            }}
            data-test-subj="syntheticsTLSCA"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <>
              {tlsRoleLabels[tlsRole]}{' '}
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificate.label"
                defaultMessage="certificate"
              />
            </>
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificate.helpText"
              defaultMessage="PEM formatted certificate for TLS client authentication."
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <EuiTextArea
            value={config.certificate}
            onChange={(event) => {
              const certificate = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                certificate,
              }));
            }}
            onBlur={(event) => {
              const certificate = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                certificate: certificate.trim(),
              }));
            }}
            data-test-subj="syntheticsTLSCert"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <>
              {tlsRoleLabels[tlsRole]}{' '}
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKey.label"
                defaultMessage="key"
              />
            </>
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKey.helpText"
              defaultMessage="PEM formatted certificate key for TLS client authentication."
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <EuiTextArea
            value={config.key}
            onChange={(event) => {
              const key = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                key,
              }));
            }}
            onBlur={(event) => {
              const key = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                key: key.trim(),
              }));
            }}
            data-test-subj="syntheticsTLSCertKey"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <>
              {tlsRoleLabels[tlsRole]}{' '}
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKeyPassphrase.label"
                defaultMessage="key passphrase"
              />
            </>
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.certificateKeyPassphrase.helpText"
              defaultMessage="Certificate key passphrase for TLS client authentication."
            />
          }
          labelAppend={<OptionalLabel />}
        >
          <EuiFieldPassword
            value={config.keyPassphrase}
            onChange={(event) => {
              const keyPassphrase = event.target.value;
              setConfig((prevConfig) => ({
                ...prevConfig,
                keyPassphrase,
              }));
            }}
            data-test-subj="syntheticsTLSCertKeyPassphrase"
          />
        </EuiFormRow>
      </EuiFormFieldset>
    );
  }
);

const tlsRoleLabels = {
  client: (
    <FormattedMessage
      id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.tlsRole.client"
      defaultMessage="Client"
    />
  ),
  server: (
    <FormattedMessage
      id="xpack.uptime.createPackagePolicy.stepConfigure.certsField.tlsRole.server"
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
        'Performs no verification of the server’s certificate. It is primarily intended as a temporary diagnostic mechanism when attempting to resolve TLS errors; its use in production environments is strongly discouraged.',
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
