/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { MultiRowInput } from '../multi_row_input';

import {
  kafkaAuthType,
  kafkaConnectionType,
  kafkaSaslMechanism,
  kafkaVerificationModes,
} from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';

const kafkaSaslOptions = [
  {
    id: kafkaSaslMechanism.Plain,
    label: 'Plain',
    'data-test-subj': 'kafkaSaslPlainRadioButton',
  },
  {
    id: kafkaSaslMechanism.ScramSha256,
    label: 'SCRAM-SHA-256',
    'data-test-subj': 'kafkaSaslScramSha256RadioButton',
  },
  {
    id: kafkaSaslMechanism.ScramSha512,
    label: 'SCRAM-SHA-512',
    'data-test-subj': 'kafkaSaslScramSha512RadioButton',
  },
];

const kafkaAuthenticationsOptions = [
  {
    id: kafkaAuthType.None,
    label: 'None',
    'data-test-subj': 'kafkaAuthenticationNoneRadioButton',
  },
  {
    id: kafkaAuthType.Userpass,
    label: 'Username / Password',
    'data-test-subj': 'kafkaAuthenticationUsernamePasswordRadioButton',
  },
  {
    id: kafkaAuthType.Ssl,
    label: 'SSL',
    'data-test-subj': 'kafkaAuthenticationSSLRadioButton',
  },
];

export const OutputFormKafkaAuthentication: React.FunctionComponent<{
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      if (inputs.kafkaAuthPasswordInput.value && !inputs.kafkaAuthPasswordSecretInput.value) {
        inputs.kafkaAuthPasswordSecretInput.setValue(inputs.kafkaAuthPasswordInput.value);
        inputs.kafkaAuthPasswordInput.clear();
      }

      if (inputs.kafkaSslKeyInput.value && !inputs.kafkaSslKeySecretInput.value) {
        inputs.kafkaSslKeySecretInput.setValue(inputs.kafkaSslKeyInput.value);
        inputs.kafkaSslKeyInput.clear();
      }
    }
  }, [
    useSecretsStorage,
    inputs.kafkaAuthPasswordInput,
    inputs.kafkaAuthPasswordSecretInput,
    inputs.kafkaSslKeyInput,
    inputs.kafkaSslKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.kafkaAuthPasswordInput.clear();
      inputs.kafkaSslKeyInput.clear();
    } else {
      inputs.kafkaAuthPasswordSecretInput.setValue('');
      inputs.kafkaSslKeySecretInput.setValue('');
    }
    onToggleSecretStorage(secretEnabled);
  };

  const kafkaVerificationModeOptions = useMemo(
    () =>
      (Object.keys(kafkaVerificationModes) as Array<keyof typeof kafkaVerificationModes>).map(
        (key) => {
          return {
            text: kafkaVerificationModes[key],
            label: key,
          };
        }
      ),
    []
  );

  const kafkaConnectionTypeOptions = useMemo(
    () =>
      (Object.keys(kafkaConnectionType) as Array<keyof typeof kafkaConnectionType>).map((key) => {
        return {
          id: kafkaConnectionType[key],
          label: key,
          'data-test-subj': `kafkaConnectionType${key}RadioButton`,
        };
      }),
    []
  );

  const renderAuthentication = () => {
    switch (inputs.kafkaAuthMethodInput.value) {
      case kafkaAuthType.None:
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaConnectionTypeLabel"
                defaultMessage="Connection"
              />
            }
          >
            <EuiRadioGroup
              style={{ display: 'flex', gap: 30 }}
              data-test-subj={'settingsOutputsFlyout.kafkaConnectionTypeRadioInput'}
              options={kafkaConnectionTypeOptions}
              compressed
              {...inputs.kafkaConnectionTypeInput.props}
            />
          </EuiFormRow>
        );
      case kafkaAuthType.Ssl:
        return (
          <>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.sslCertificateInputLabel"
                  defaultMessage="Client SSL certificate"
                />
              }
              {...inputs.kafkaSslCertificateInput.formRowProps}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.kafkaSslCertificateInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.sslCertificateInputPlaceholder',
                  {
                    defaultMessage: 'Specify ssl certificate',
                  }
                )}
              />
            </EuiFormRow>
            {!useSecretsStorage ? (
              <SecretFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.sslKeyInputLabel"
                    defaultMessage="Client SSL certificate key"
                  />
                }
                {...inputs.kafkaSslKeyInput.formRowProps}
                useSecretsStorage={useSecretsStorage}
                onToggleSecretStorage={onToggleSecretAndClearValue}
              >
                <EuiTextArea
                  fullWidth
                  rows={5}
                  {...inputs.kafkaSslKeyInput.props}
                  placeholder={i18n.translate(
                    'xpack.fleet.settings.editOutputFlyout.sslKeyInputPlaceholder',
                    {
                      defaultMessage: 'Specify certificate key',
                    }
                  )}
                />
              </SecretFormRow>
            ) : (
              <SecretFormRow
                fullWidth
                title={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.kafkaPasswordSecretInputTitle',
                  {
                    defaultMessage: 'Client SSL certificate key',
                  }
                )}
                {...inputs.kafkaSslKeySecretInput.formRowProps}
                useSecretsStorage={useSecretsStorage}
                onToggleSecretStorage={onToggleSecretAndClearValue}
                cancelEdit={inputs.kafkaSslKeySecretInput.cancelEdit}
              >
                <EuiTextArea
                  fullWidth
                  rows={5}
                  data-test-subj="kafkaSslKeySecretInput"
                  {...inputs.kafkaSslKeySecretInput.props}
                  placeholder={i18n.translate(
                    'xpack.fleet.settings.editOutputFlyout.sslKeyInputPlaceholder',
                    {
                      defaultMessage: 'Specify certificate key',
                    }
                  )}
                />
              </SecretFormRow>
            )}
          </>
        );
      default:
      case kafkaAuthType.Userpass:
        return (
          <>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaUsernameInputLabel"
                  defaultMessage="Username"
                />
              }
              {...inputs.kafkaAuthUsernameInput.formRowProps}
            >
              <EuiFieldText
                data-test-subj="settingsOutputsFlyout.kafkaUsernameInput"
                fullWidth
                {...inputs.kafkaAuthUsernameInput.props}
              />
            </EuiFormRow>
            {!useSecretsStorage ? (
              <SecretFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.kafkaPasswordInputLabel"
                    defaultMessage="Password"
                  />
                }
                {...inputs.kafkaAuthPasswordInput.formRowProps}
                useSecretsStorage={useSecretsStorage}
                onToggleSecretStorage={onToggleSecretAndClearValue}
              >
                <EuiFieldPassword
                  type={'dual'}
                  data-test-subj="settingsOutputsFlyout.kafkaPasswordInput"
                  fullWidth
                  {...inputs.kafkaAuthPasswordInput.props}
                />
              </SecretFormRow>
            ) : (
              <SecretFormRow
                fullWidth
                title={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.kafkaPasswordInputtitle',
                  {
                    defaultMessage: 'Password',
                  }
                )}
                {...inputs.kafkaAuthPasswordSecretInput.formRowProps}
                useSecretsStorage={useSecretsStorage}
                onToggleSecretStorage={onToggleSecretAndClearValue}
                cancelEdit={inputs.kafkaAuthPasswordSecretInput.cancelEdit}
              >
                <EuiFieldPassword
                  type={'dual'}
                  data-test-subj="settingsOutputsFlyout.kafkaPasswordSecretInput"
                  fullWidth
                  {...inputs.kafkaAuthPasswordSecretInput.props}
                />
              </SecretFormRow>
            )}
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaSaslInputLabel"
                  defaultMessage="SASL Mechanism"
                />
              }
            >
              <EuiRadioGroup
                style={{ display: 'flex', gap: 30 }}
                data-test-subj={'settingsOutputsFlyout.kafkaSaslInput'}
                options={kafkaSaslOptions}
                compressed
                {...inputs.kafkaSaslMechanismInput.props}
              />
            </EuiFormRow>
          </>
        );
    }
  };

  const renderEncryptionSection = () => {
    const displayEncryptionSection =
      inputs.kafkaConnectionTypeInput.value !== kafkaConnectionType.Plaintext ||
      inputs.kafkaAuthMethodInput.value !== kafkaAuthType.None;

    if (!displayEncryptionSection) {
      return null;
    }

    return (
      <>
        <EuiSpacer size="m" />

        <MultiRowInput
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputPlaceholder',
            {
              defaultMessage: 'Specify certificate authority',
            }
          )}
          label={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputLabel',
            {
              defaultMessage: 'Server SSL certificate authorities (optional)',
            }
          )}
          multiline={true}
          sortable={false}
          {...inputs.kafkaSslCertificateAuthoritiesInput.props}
        />

        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaVerificationModeInputLabel"
              defaultMessage="Verification mode"
            />
          }
        >
          <EuiSelect
            fullWidth
            data-test-subj="settingsOutputsFlyout.kafkaVerificationModeInput"
            {...inputs.kafkaVerificationModeInput.props}
            options={kafkaVerificationModeOptions}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaVerificationModeInputPlaceholder',
              {
                defaultMessage: 'Specify verification mode',
              }
            )}
          />
        </EuiFormRow>
      </>
    );
  };

  return (
    <>
      <EuiPanel
        borderRadius="m"
        hasShadow={false}
        paddingSize={'m'}
        color={'subdued'}
        data-test-subj="settingsOutputsFlyout.kafkaAuthenticationPanel"
      >
        <EuiTitle size="s">
          <h3 id="FleetEditOutputFlyoutKafkaAuthenticationTitle">
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaAuthenticationTitle"
              defaultMessage="Authentication"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth>
          <EuiRadioGroup
            style={{ display: 'flex', gap: 30 }}
            data-test-subj={'settingsOutputsFlyout.kafkaAuthenticationRadioInput'}
            options={kafkaAuthenticationsOptions}
            compressed
            {...inputs.kafkaAuthMethodInput.props}
          />
        </EuiFormRow>
        {renderAuthentication()}
      </EuiPanel>
      {renderEncryptionSection()}
    </>
  );
};
