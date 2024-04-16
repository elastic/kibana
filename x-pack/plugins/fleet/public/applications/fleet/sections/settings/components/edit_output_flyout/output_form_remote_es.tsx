/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiCallOut, EuiCodeBlock, EuiFieldText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import type { OutputFormInputsType } from './use_output_form';
import { SecretFormRow } from './output_form_secret_form_row';

interface Props {
  inputs: OutputFormInputsType;
  useSecretsStorage: boolean;
  onToggleSecretStorage: (secretEnabled: boolean) => void;
}

export const OutputFormRemoteEsSection: React.FunctionComponent<Props> = (props) => {
  const { inputs, useSecretsStorage, onToggleSecretStorage } = props;
  const [isConvertedToSecret, setIsConvertedToSecret] = React.useState({
    serviceToken: false,
  });

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      if (inputs.serviceTokenInput.value && !inputs.serviceTokenSecretInput.value) {
        inputs.serviceTokenSecretInput.setValue(inputs.serviceTokenInput.value);
        inputs.serviceTokenInput.clear();
        setIsConvertedToSecret({ serviceToken: true });
      }
    }
  }, [
    useSecretsStorage,
    inputs.serviceTokenInput,
    inputs.serviceTokenSecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
  ]);

  const onToggleSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.serviceTokenInput.clear();
    } else {
      inputs.serviceTokenSecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, serviceToken: false });
    onToggleSecretStorage(secretEnabled);
  };

  return (
    <>
      <MultiRowInput
        data-test-subj="settingsOutputsFlyout.hostUrlInput"
        label={i18n.translate('xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputLabel', {
          defaultMessage: 'Hosts',
        })}
        placeholder={i18n.translate(
          'xpack.fleet.settings.editOutputFlyout.remoteEsHostsInputPlaceholder',
          {
            defaultMessage: 'Specify host URL',
          }
        )}
        {...inputs.elasticsearchUrlInput.props}
        isUrl
      />
      <EuiSpacer size="m" />
      {!useSecretsStorage ? (
        <SecretFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.serviceTokenLabel"
              defaultMessage="Service Token"
            />
          }
          {...inputs.serviceTokenInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretAndClearValue}
        >
          <EuiFieldText
            fullWidth
            data-test-subj="serviceTokenSecretInput"
            {...inputs.serviceTokenInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.remoteESHostPlaceholder',
              {
                defaultMessage: 'Specify service token',
              }
            )}
          />
        </SecretFormRow>
      ) : (
        <SecretFormRow
          fullWidth
          title={i18n.translate('xpack.fleet.settings.editOutputFlyout.serviceTokenLabel', {
            defaultMessage: 'Service Token',
          })}
          {...inputs.serviceTokenSecretInput.formRowProps}
          cancelEdit={inputs.serviceTokenSecretInput.cancelEdit}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.serviceToken}
          onToggleSecretStorage={onToggleSecretAndClearValue}
        >
          <EuiFieldText
            data-test-subj="serviceTokenSecretInput"
            fullWidth
            {...inputs.serviceTokenSecretInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.remoteESHostPlaceholder',
              {
                defaultMessage: 'Specify service token',
              }
            )}
          />
        </SecretFormRow>
      )}
      <EuiSpacer size="m" />
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.serviceTokenCalloutText"
            defaultMessage="Generate a service token by running this API request in the Remote Kibana Console and copy the response value"
          />
        }
        data-test-subj="serviceTokenCallout"
      >
        <EuiCodeBlock isCopyable={true}>
          {`POST kbn:/api/fleet/service_tokens
{
  "remote": true
}`}
        </EuiCodeBlock>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
