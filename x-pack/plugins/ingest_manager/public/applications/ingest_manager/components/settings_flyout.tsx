/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiButton,
  EuiFlyoutFooter,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiRadioGroup,
  EuiComboBox,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import { useInput, useComboInput, useCore, useGetSettings, sendPutSettings } from '../hooks';
import { useGetOutputs, sendPutOutput } from '../hooks/use_request/outputs';

interface Props {
  onClose: () => void;
}

function useSettingsForm(outputId: string | undefined) {
  const { notifications } = useCore();
  const kibanaUrlInput = useInput();
  const elasticsearchUrlInput = useComboInput([]);

  return {
    onSubmit: async () => {
      try {
        if (!outputId) {
          throw new Error('Unable to load outputs');
        }
        await sendPutOutput(outputId, {
          hosts: elasticsearchUrlInput.value,
        });
        await sendPutSettings({
          kibana_url: kibanaUrlInput.value,
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestManager.settings.success.message', {
          defaultMessage: 'Settings saved',
        })
      );
    },
    inputs: {
      kibanaUrl: kibanaUrlInput,
      elasticsearchUrl: elasticsearchUrlInput,
    },
  };
}

export const SettingFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const core = useCore();
  const settingsRequest = useGetSettings();
  const settings = settingsRequest?.data?.item;
  const outputsRequest = useGetOutputs();
  const output = outputsRequest.data?.items?.[0];
  const { inputs, onSubmit } = useSettingsForm(output?.id);

  useEffect(() => {
    if (output) {
      inputs.elasticsearchUrl.setValue(output.hosts || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output]);

  useEffect(() => {
    if (settings) {
      inputs.kibanaUrl.setValue(
        settings.kibana_url || `${window.location.origin}${core.http.basePath.get()}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const body = (
    <EuiForm>
      <EuiRadioGroup
        options={[
          {
            id: 'enabled',
            label: i18n.translate('xpack.ingestManager.settings.autoUpgradeEnabledLabel', {
              defaultMessage:
                'Automatically update agent binaries to use the latest minor version.',
            }),
          },
          {
            id: 'disabled',
            disabled: true,
            label: i18n.translate('xpack.ingestManager.settings.autoUpgradeDisabledLabel', {
              defaultMessage: 'Manually manage agent binary versions. Requires Gold license.',
            }),
          },
        ]}
        idSelected={'enabled'}
        onChange={id => {}}
        legend={{
          children: (
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.ingestManager.settings.autoUpgradeFieldLabel"
                  defaultMessage="Elastic Agent binary version"
                />
              </h3>
            </EuiTitle>
          ),
        }}
      />
      <EuiSpacer size="l" />
      <EuiRadioGroup
        options={[
          {
            id: 'enabled',
            label: i18n.translate(
              'xpack.ingestManager.settings.integrationUpgradeEnabledFieldLabel',
              {
                defaultMessage:
                  'Automatically update Integrations to the latest version to receive the latest assets. Agent configurations may need to be updated in order to use new features.',
              }
            ),
          },
          {
            id: 'disabled',
            disabled: true,
            label: i18n.translate(
              'xpack.ingestManager.settings.integrationUpgradeDisabledFieldLabel',
              {
                defaultMessage: 'Manually manage integration versions yourself.',
              }
            ),
          },
        ]}
        idSelected={'enabled'}
        onChange={id => {}}
        legend={{
          children: (
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.ingestManager.settings.integrationUpgradeFieldLabel"
                  defaultMessage="Elastic integration version"
                />
              </h3>
            </EuiTitle>
          ),
        }}
      />
      <EuiSpacer size="l" />
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.ingestManager.settings.globalOutputTitle"
            defaultMessage="Global output"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.ingestManager.settings.globalOutputDescription"
          defaultMessage="The global output is applied to all agent configurations and specifies where data is sent."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.settings.kibanaUrlLabel', {
            defaultMessage: 'Kibana URL',
          })}
        >
          <EuiFieldText required={true} {...inputs.kibanaUrl.props} name="kibanaUrl" />
        </EuiFormRow>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.settings.elasticsearchUrlLabel', {
            defaultMessage: 'Elasticsearch URL',
          })}
        >
          <EuiComboBox noSuggestions {...inputs.elasticsearchUrl.props} />
        </EuiFormRow>
      </EuiFormRow>
    </EuiForm>
  );

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="IngestManagerSettingsFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="IngestManagerSettingsFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.settings.flyoutTitle"
              defaultMessage="Ingest Manager settings"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{body}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.settings.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSubmit} iconType="save">
              <FormattedMessage
                id="xpack.ingestManager.settings.saveButtonLabel"
                defaultMessage="Save settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
