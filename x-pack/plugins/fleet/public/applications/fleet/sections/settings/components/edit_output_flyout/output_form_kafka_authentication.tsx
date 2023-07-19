/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { MultiRowInput } from '../multi_row_input';
import { kafkaAuthType, kafkaSaslMechanism } from '../../../../../../../common/constants';

import type { OutputFormInputsType } from './use_output_form';

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
    id: kafkaAuthType.Userpass,
    label: 'Username / Password',
    'data-test-subj': 'kafkaAuthenticationUsernamePasswordRadioButton',
  },
  {
    id: kafkaAuthType.Ssl,
    label: 'SSL',
    'data-test-subj': 'kafkaAuthenticationSSLRadioButton',
  },
  {
    id: kafkaAuthType.Kerberos,
    label: 'Kerberos',
    'data-test-subj': 'kafkaAuthenticationKerberosRadioButton',
  },
];

export const OutputFormKafkaAuthentication: React.FunctionComponent<{
  inputs: OutputFormInputsType;
}> = (props) => {
  const { inputs } = props;

  const renderAuthentication = () => {
    switch (inputs.kafkaAuthMethodInput.value) {
      case kafkaAuthType.Ssl:
        return (
          <>
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
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.sslKeyInputLabel"
                  defaultMessage="Client SSL certificate key"
                />
              }
              {...inputs.kafkaSslKeyInput.formRowProps}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslKeyInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.sslKeyInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </EuiFormRow>
          </>
        );
      case kafkaAuthType.Kerberos:
        return null;
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
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaPasswordInputLabel"
                  defaultMessage="Password"
                />
              }
              {...inputs.kafkaAuthPasswordInput.formRowProps}
            >
              <EuiFieldText
                data-test-subj="settingsOutputsFlyout.kafkaPasswordInput"
                fullWidth
                {...inputs.kafkaAuthPasswordInput.props}
              />
            </EuiFormRow>
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

  return (
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
  );
};
