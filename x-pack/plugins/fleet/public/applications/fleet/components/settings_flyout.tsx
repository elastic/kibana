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
  EuiRadioGroup,
  EuiComboBox,
  EuiCodeEditor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import { safeLoad } from 'js-yaml';
import {
  useComboInput,
  useStartServices,
  useGetSettings,
  useInput,
  sendPutSettings,
} from '../hooks';
import { useGetOutputs, sendPutOutput } from '../hooks/use_request/outputs';
import { isDiffPathProtocol } from '../../../../common/';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

interface Props {
  onClose: () => void;
}

function useSettingsForm(outputId: string | undefined, onSuccess: () => void) {
  const [isLoading, setIsloading] = React.useState(false);
  const { notifications } = useStartServices();
  const kibanaUrlsInput = useComboInput([], (value) => {
    if (value.length === 0) {
      return [
        i18n.translate('xpack.fleet.settings.kibanaUrlEmptyError', {
          defaultMessage: 'At least one URL is required',
        }),
      ];
    }
    if (value.some((v) => !v.match(URL_REGEX))) {
      return [
        i18n.translate('xpack.fleet.settings.kibanaUrlError', {
          defaultMessage: 'Invalid URL',
        }),
      ];
    }
    if (isDiffPathProtocol(value)) {
      return [
        i18n.translate('xpack.fleet.settings.kibanaUrlDifferentPathOrProtocolError', {
          defaultMessage: 'Protocol and path must be the same for each URL',
        }),
      ];
    }
  });
  const elasticsearchUrlInput = useComboInput([], (value) => {
    if (value.some((v) => !v.match(URL_REGEX))) {
      return [
        i18n.translate('xpack.fleet.settings.elasticHostError', {
          defaultMessage: 'Invalid URL',
        }),
      ];
    }
  });

  const additionalYamlConfigInput = useInput('', (value) => {
    try {
      safeLoad(value);
      return;
    } catch (error) {
      return [
        i18n.translate('xpack.fleet.settings.invalidYamlFormatErrorMessage', {
          defaultMessage: 'Invalid YAML: {reason}',
          values: { reason: error.message },
        }),
      ];
    }
  });
  return {
    isLoading,
    onSubmit: async () => {
      if (
        !kibanaUrlsInput.validate() ||
        !elasticsearchUrlInput.validate() ||
        !additionalYamlConfigInput.validate()
      ) {
        return;
      }

      try {
        setIsloading(true);
        if (!outputId) {
          throw new Error('Unable to load outputs');
        }
        const outputResponse = await sendPutOutput(outputId, {
          hosts: elasticsearchUrlInput.value,
          config_yaml: additionalYamlConfigInput.value,
        });
        if (outputResponse.error) {
          throw outputResponse.error;
        }
        const settingsResponse = await sendPutSettings({
          kibana_urls: kibanaUrlsInput.value,
        });
        if (settingsResponse.error) {
          throw settingsResponse.error;
        }
        notifications.toasts.addSuccess(
          i18n.translate('xpack.fleet.settings.success.message', {
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
      kibanaUrls: kibanaUrlsInput,
      elasticsearchUrl: elasticsearchUrlInput,
      additionalYamlConfig: additionalYamlConfigInput,
    },
  };
}

export const SettingFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const settingsRequest = useGetSettings();
  const settings = settingsRequest?.data?.item;
  const outputsRequest = useGetOutputs();
  const output = outputsRequest.data?.items?.[0];
  const { inputs, onSubmit, isLoading } = useSettingsForm(output?.id, onClose);

  useEffect(() => {
    if (output) {
      inputs.elasticsearchUrl.setValue(output.hosts || []);
      inputs.additionalYamlConfig.setValue(
        output.config_yaml ||
          `# YAML settings here will be added to the Elasticsearch output section of each policy`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output]);

  useEffect(() => {
    if (settings) {
      inputs.kibanaUrls.setValue(settings.kibana_urls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const body = (
    <EuiForm>
      <EuiRadioGroup
        options={[
          {
            id: 'enabled',
            label: i18n.translate('xpack.fleet.settings.autoUpgradeEnabledLabel', {
              defaultMessage:
                'Automatically update agent binaries to use the latest minor version.',
            }),
          },
          {
            id: 'disabled',
            disabled: true,
            label: i18n.translate('xpack.fleet.settings.autoUpgradeDisabledLabel', {
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
                  id="xpack.fleet.settings.autoUpgradeFieldLabel"
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
            label: i18n.translate('xpack.fleet.settings.integrationUpgradeEnabledFieldLabel', {
              defaultMessage:
                'Automatically update integrations to the latest version to get the latest assets. You might need to update agent policies to use new features.',
            }),
          },
          {
            id: 'disabled',
            disabled: true,
            label: i18n.translate('xpack.fleet.settings.integrationUpgradeDisabledFieldLabel', {
              defaultMessage: 'Manually manage integration versions yourself.',
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
                  id="xpack.fleet.settings.integrationUpgradeFieldLabel"
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
            id="xpack.fleet.settings.globalOutputTitle"
            defaultMessage="Global output"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.settings.globalOutputDescription"
          defaultMessage="Specify where to send data. These settings are applied to all Elastic Agent policies."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.settings.kibanaUrlLabel', {
            defaultMessage: 'Kibana URL',
          })}
          {...inputs.kibanaUrls.formRowProps}
        >
          <EuiComboBox noSuggestions {...inputs.kibanaUrls.props} />
        </EuiFormRow>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.fleet.settings.elasticsearchUrlLabel', {
            defaultMessage: 'Elasticsearch URL',
          })}
          {...inputs.elasticsearchUrl.formRowProps}
        >
          <EuiComboBox noSuggestions {...inputs.elasticsearchUrl.props} />
        </EuiFormRow>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth>
        <EuiFormRow
          {...inputs.additionalYamlConfig.formRowProps}
          label={i18n.translate('xpack.fleet.settings.additionalYamlConfig', {
            defaultMessage: 'Elasticsearch output configuration',
          })}
          fullWidth={true}
        >
          <EuiCodeEditor
            width="100%"
            mode="yaml"
            theme="textmate"
            setOptions={{
              minLines: 10,
              maxLines: 30,
              tabSize: 2,
              showGutter: false,
            }}
            {...inputs.additionalYamlConfig.props}
            onChange={inputs.additionalYamlConfig.setValue}
          />
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
              id="xpack.fleet.settings.flyoutTitle"
              defaultMessage="Fleet settings"
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
                id="xpack.fleet.settings.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSubmit} iconType="save" isLoading={isLoading}>
              <FormattedMessage
                id="xpack.fleet.settings.saveButtonLabel"
                defaultMessage="Save settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
