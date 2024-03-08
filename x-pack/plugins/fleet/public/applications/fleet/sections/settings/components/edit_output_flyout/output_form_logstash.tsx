/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiTextArea, EuiSpacer, EuiLink, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../hooks';
import { LogstashInstructions } from '../logstash_instructions';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';
import { EncryptionKeyRequiredCallout } from './encryption_key_required_callout';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
  hasEncryptedSavedObjectConfigured: boolean;
}

export const OutputFormLogstashSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage, hasEncryptedSavedObjectConfigured } =
    props;
  const { docLinks } = useStartServices();

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      if (inputs.sslKeyInput.value && !inputs.sslKeySecretInput.value) {
        inputs.sslKeySecretInput.setValue(inputs.sslKeyInput.value);
        inputs.sslKeyInput.clear();
      }
    }
  }, [
    useSecretsStorage,
    inputs.sslKeyInput,
    inputs.sslKeySecretInput,
    isFirstLoad,
    setIsFirstLoad,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.sslKeyInput.clear();
    } else {
      inputs.sslKeySecretInput.setValue('');
    }
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <>
      {!hasEncryptedSavedObjectConfigured && (
        <>
          <EuiSpacer size="m" />
          <EncryptionKeyRequiredCallout />
        </>
      )}
      <EuiSpacer size="m" />
      <LogstashInstructions />
      <EuiSpacer size="m" />
      <MultiRowInput
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.logstashHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host',
          }
        )}
        sortable={false}
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.logstashHostsInputDescription"
            defaultMessage="Specify the addresses that your agents will use to connect to Logstash. {guideLink}."
            values={{
              guideLink: (
                <EuiLink href={docLinks.links.fleet.logstashSettings} target="_blank" external>
                  <FormattedMessage
                    id="xpack.fleet.settings.fleetSettingsLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.logstashHostsInputLabel', {
          defaultMessage: 'Logstash hosts',
        })}
        {...inputs.logstashHostsInput.props}
      />
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
        {...inputs.sslCertificateAuthoritiesInput.props}
      />
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.sslCertificateInputLabel"
            defaultMessage="Client SSL certificate"
          />
        }
        {...inputs.sslCertificateInput.formRowProps}
      >
        <EuiTextArea
          fullWidth
          rows={5}
          {...inputs.sslCertificateInput.props}
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
          {...inputs.sslKeyInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretAndClearValue}
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
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.editOutputFlyout.sslKeySecretInputTitle', {
            defaultMessage: 'Client SSL certificate key',
          })}
          {...inputs.sslKeySecretInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretAndClearValue}
          cancelEdit={inputs.sslKeySecretInput.cancelEdit}
        >
          <EuiTextArea
            fullWidth
            rows={5}
            {...inputs.sslKeySecretInput.props}
            data-test-subj="sslKeySecretInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.sslKeySecretInputPlaceholder',
              {
                defaultMessage: 'Specify certificate key',
              }
            )}
          />
        </SecretFormRow>
      )}
    </>
  );
};
