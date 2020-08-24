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

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

interface Props {
  onClose: () => void;
}

function useSettingsForm(outputId: string | undefined, onSuccess: () => void) {
  const [isLoading, setIsloading] = React.useState(false);
  const { notifications } = useCore();
  const kibanaUrlInput = useInput('', (value) => {
    if (!value.match(URL_REGEX)) {
      return [
        i18n.translate('xpack.ingestManager.settings.kibanaUrlError', {
          defaultMessage: 'Invalid URL',
        }),
      ];
    }
  });
  const elasticsearchUrlInput = useComboInput([], (value) => {
    if (value.some((v) => !v.match(URL_REGEX))) {
      return [
        i18n.translate('xpack.ingestManager.settings.elasticHostError', {
          defaultMessage: 'Invalid URL',
        }),
      ];
    }
  });

  return {
    isLoading,
    onSubmit: async () => {
      if (!kibanaUrlInput.validate() || !elasticsearchUrlInput.validate()) {
        return;
      }

      try {
        setIsloading(true);
        if (!outputId) {
          throw new Error('Unable to load outputs');
        }
        const outputResponse = await sendPutOutput(outputId, {
          hosts: elasticsearchUrlInput.value,
        });
        if (outputResponse.error) {
          throw outputResponse.error;
        }
        const settingsResponse = await sendPutSettings({
          kibana_url: kibanaUrlInput.value,
        });
        if (settingsResponse.error) {
          throw settingsResponse.error;
        }
        notifications.toasts.addSuccess(
          i18n.translate('xpack.ingestManager.settings.success.message', {
            defaultMessage: 'Settings saved',
          })
        );
        setIsloading(false);
        onSuccess();
      } catch (error) {
        setIsloading(false);
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
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
  const { inputs, onSubmit, isLoading } = useSettingsForm(output?.id, onClose);

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
              defaultMessage:
                'Manually manage agent binary versions. Requires a Gold subscription.',
            }),
          },
        ]}
        idSelected={'enabled'}
        onChange={(id) => {}}
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
                  'Automatically update integrations to the latest version to get the latest assets. You might need to update agent policies to use new features.',
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
        onChange={(id) => {}}
        legend={{
          children: (
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.ingestManager.settings.integrationUpgradeFieldLabel"
                  defaultMessage="Integration version"
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
          defaultMessage="Specify where to send data. These settings are applied to all Elastic Agent policies."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.settings.kibanaUrlLabel', {
            defaultMessage: 'Kibana URL',
          })}
          {...inputs.kibanaUrl.formRowProps}
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
          {...inputs.elasticsearchUrl.formRowProps}
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
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.settings.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSubmit} iconType="save" isLoading={isLoading}>
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
