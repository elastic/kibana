/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';

import { ExperimentalFeaturesService } from '../../../../services';

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
    apiKey: false,
  });

  const { remoteIntegrationSync } = ExperimentalFeaturesService.get();

  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  useEffect(() => {
    if (!isFirstLoad) return;
    setIsFirstLoad(false);
    // populate the secret input with the value of the plain input in order to re-save the output with secret storage
    if (useSecretsStorage) {
      if (inputs.serviceTokenInput.value && !inputs.serviceTokenSecretInput.value) {
        inputs.serviceTokenSecretInput.setValue(inputs.serviceTokenInput.value);
        inputs.serviceTokenInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, serviceToken: true });
      }
      if (
        inputs.integrationSyncApiKeyInput.value &&
        !inputs.integrationSyncApiKeySecretInput.value
      ) {
        inputs.integrationSyncApiKeySecretInput.setValue(inputs.integrationSyncApiKeyInput.value);
        inputs.integrationSyncApiKeyInput.clear();
        setIsConvertedToSecret({ ...isConvertedToSecret, apiKey: true });
      }
    }
  }, [
    useSecretsStorage,
    inputs.serviceTokenInput,
    inputs.serviceTokenSecretInput,
    isFirstLoad,
    setIsFirstLoad,
    isConvertedToSecret,
    inputs.integrationSyncApiKeyInput,
    inputs.integrationSyncApiKeySecretInput,
  ]);

  const onToggleServiceTokenSecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.serviceTokenInput.clear();
    } else {
      inputs.serviceTokenSecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, serviceToken: false });
    onToggleSecretStorage(secretEnabled);
  };

  const onToggleAPIKeySecretAndClearValue = (secretEnabled: boolean) => {
    if (secretEnabled) {
      inputs.integrationSyncApiKeyInput.clear();
    } else {
      inputs.integrationSyncApiKeySecretInput.setValue('');
    }
    setIsConvertedToSecret({ ...isConvertedToSecret, apiKey: false });
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
              defaultMessage="Service token"
            />
          }
          {...inputs.serviceTokenInput.formRowProps}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleServiceTokenSecretAndClearValue}
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
            defaultMessage: 'Service token',
          })}
          {...inputs.serviceTokenSecretInput.formRowProps}
          cancelEdit={inputs.serviceTokenSecretInput.cancelEdit}
          useSecretsStorage={useSecretsStorage}
          isConvertedToSecret={isConvertedToSecret.serviceToken}
          onToggleSecretStorage={onToggleServiceTokenSecretAndClearValue}
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
      {remoteIntegrationSync && (
        <EuiFormRow
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.remoteESTypeText"
              defaultMessage="If enabled, integrations assets will be installed on the remote Elasticsearch cluster."
            />
          }
        >
          <>
            <EuiSwitch
              {...inputs.integrationSyncInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.synchronizeIntegrationsSwitchLabel"
                  defaultMessage="Synchronize integrations."
                />
              }
            />
          </>
        </EuiFormRow>
      )}
      {inputs.integrationSyncInput.value && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.remoteKibanaUrlInputLabel"
                defaultMessage="Kibana URL"
              />
            }
            {...inputs.integrationSyncKibanaUrlInput.formRowProps}
          >
            <EuiFieldText
              fullWidth
              {...inputs.integrationSyncKibanaUrlInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.remoteKibanaUrlInputPlaceholder',
                {
                  defaultMessage: 'Specify Kibana URL',
                }
              )}
            />
          </EuiFormRow>
        </>
      )}
      {inputs.integrationSyncInput.value &&
        (!useSecretsStorage ? (
          <SecretFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.synchronizeIntegrationsAPIKeyLabel"
                defaultMessage="Kibana API key"
              />
            }
            {...inputs.integrationSyncApiKeyInput.formRowProps}
            useSecretsStorage={useSecretsStorage}
            onToggleSecretStorage={onToggleAPIKeySecretAndClearValue}
          >
            <EuiFieldText
              data-test-subj="kibanaAPIKeySecretInput"
              fullWidth
              {...inputs.integrationSyncApiKeyInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.remoteAPIKeyPlaceholder',
                {
                  defaultMessage: 'Specify API key',
                }
              )}
            />
          </SecretFormRow>
        ) : (
          <SecretFormRow
            fullWidth
            title={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.synchronizeIntegrationsAPIKeyLabel',
              {
                defaultMessage: 'Kibana API key',
              }
            )}
            {...inputs.integrationSyncApiKeySecretInput.formRowProps}
            cancelEdit={inputs.integrationSyncApiKeySecretInput.cancelEdit}
            useSecretsStorage={useSecretsStorage}
            isConvertedToSecret={isConvertedToSecret.apiKey}
            onToggleSecretStorage={onToggleAPIKeySecretAndClearValue}
          >
            <EuiFieldText
              data-test-subj="kibanaAPIKeySecretInput"
              fullWidth
              {...inputs.integrationSyncApiKeySecretInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.remoteAPIKeyPlaceholder',
                {
                  defaultMessage: 'Specify API key',
                }
              )}
            />
          </SecretFormRow>
        ))}
      {inputs.integrationSyncInput.value && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.remoteAPIKeyCalloutText"
                defaultMessage="Generate an API key by running this API request in the Remote Kibana Console and copy the response value"
              />
            }
            data-test-subj="remoteAPIKeyCallout"
          >
            <EuiCodeBlock isCopyable={true}>
              {`POST /_security/api_key
{
  "name": "integration_sync",
  "role_descriptors": {
    "integration_writer": {
      "cluster": [],
      "indices":[],
      "applications": [
        {
          "application": "kibana-.kibana",
            "privileges": ["feature_fleet.all", "feature_fleetv2.all"],
            "resources": ["*"]
        }
      ]
    }
  }
}`}
            </EuiCodeBlock>
          </EuiCallOut>
        </>
      )}
      <EuiSpacer size="m" />
    </>
  );
};
