/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
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
  EuiComboBox,
  EuiCode,
  EuiCodeEditor,
  EuiLink,
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
} from '../../hooks';
import { useGetOutputs, sendPutOutput } from '../../hooks/use_request/outputs';
import { isDiffPathProtocol } from '../../../../../common/';

import { SettingsConfirmModal } from './confirm_modal';
import type { SettingsConfirmModalProps } from './confirm_modal';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

interface Props {
  onClose: () => void;
}

function isSameArrayValue(arrayA: string[] = [], arrayB: string[] = []) {
  return arrayA.length === arrayB.length && arrayA.every((val, index) => val === arrayB[index]);
}

function useSettingsForm(outputId: string | undefined, onSuccess: () => void) {
  const [isLoading, setIsloading] = React.useState(false);
  const { notifications } = useStartServices();

  const fleetServerHostsInput = useComboInput([], (value) => {
    if (value.length === 0) {
      return [
        i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
          defaultMessage: 'At least one URL is required',
        }),
      ];
    }
    if (value.some((v) => !v.match(URL_REGEX))) {
      return [
        i18n.translate('xpack.fleet.settings.fleetServerHostsError', {
          defaultMessage: 'Invalid URL',
        }),
      ];
    }
    if (value.length && isDiffPathProtocol(value)) {
      return [
        i18n.translate('xpack.fleet.settings.fleetServerHostsDifferentPathOrProtocolError', {
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

  const validate = useCallback(() => {
    if (
      !fleetServerHostsInput.validate() ||
      !elasticsearchUrlInput.validate() ||
      !additionalYamlConfigInput.validate()
    ) {
      return false;
    }

    return true;
  }, [fleetServerHostsInput, elasticsearchUrlInput, additionalYamlConfigInput]);

  return {
    isLoading,
    validate,
    submit: async () => {
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
          fleet_server_hosts: fleetServerHostsInput.value,
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
      fleetServerHosts: fleetServerHostsInput,
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
  const { inputs, submit, validate, isLoading } = useSettingsForm(output?.id, onClose);

  const [isConfirmModalVisible, setConfirmModalVisible] = React.useState(false);

  const onSubmit = useCallback(() => {
    if (validate()) {
      setConfirmModalVisible(true);
    }
  }, [validate, setConfirmModalVisible]);

  const onConfirm = useCallback(() => {
    setConfirmModalVisible(false);
    submit();
  }, [submit]);

  const onConfirmModalClose = useCallback(() => {
    setConfirmModalVisible(false);
  }, [setConfirmModalVisible]);

  useEffect(() => {
    if (output) {
      inputs.elasticsearchUrl.setValue(output.hosts || []);
      inputs.additionalYamlConfig.setValue(output.config_yaml || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output]);

  useEffect(() => {
    if (settings) {
      inputs.fleetServerHosts.setValue([...settings.fleet_server_hosts]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const isUpdated = React.useMemo(() => {
    if (!settings || !output) {
      return false;
    }
    return (
      !isSameArrayValue(settings.fleet_server_hosts, inputs.fleetServerHosts.value) ||
      !isSameArrayValue(output.hosts, inputs.elasticsearchUrl.value) ||
      (output.config_yaml || '') !== inputs.additionalYamlConfig.value
    );
  }, [settings, inputs, output]);

  const changes = React.useMemo(() => {
    if (!settings || !output || !isConfirmModalVisible) {
      return [];
    }

    const tmpChanges: SettingsConfirmModalProps['changes'] = [];
    if (!isSameArrayValue(output.hosts, inputs.elasticsearchUrl.value)) {
      tmpChanges.push(
        {
          type: 'elasticsearch',
          direction: 'removed',
          urls: output.hosts || [],
        },
        {
          type: 'elasticsearch',
          direction: 'added',
          urls: inputs.elasticsearchUrl.value,
        }
      );
    }

    if (!isSameArrayValue(settings.fleet_server_hosts, inputs.fleetServerHosts.value)) {
      tmpChanges.push(
        {
          type: 'fleet_server',
          direction: 'removed',
          urls: settings.fleet_server_hosts,
        },
        {
          type: 'fleet_server',
          direction: 'added',
          urls: inputs.fleetServerHosts.value,
        }
      );
    }

    return tmpChanges;
  }, [settings, inputs, output, isConfirmModalVisible]);

  const body = settings && (
    <EuiForm>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.fleet.settings.globalOutputDescription"
          defaultMessage="These settings are applied globally to the {outputs} section of all agent policies and affect all enrolled agents."
          values={{
            outputs: <EuiCode>outputs</EuiCode>,
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.settings.fleetServerHostsLabel', {
          defaultMessage: 'Fleet Server hosts',
        })}
        helpText={
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsHelpTect"
            defaultMessage="Specify the URLs that your agents will use to connect to a Fleet Server. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Refer to the {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/fleet/current/index.html"
                  target="_blank"
                  external
                >
                  <FormattedMessage
                    id="xpack.fleet.settings.userGuideLink"
                    defaultMessage="Fleet User Guide"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        {...inputs.fleetServerHosts.formRowProps}
      >
        <EuiComboBox fullWidth noSuggestions {...inputs.fleetServerHosts.props} />
      </EuiFormRow>

      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.settings.elasticsearchUrlLabel', {
          defaultMessage: 'Elasticsearch hosts',
        })}
        helpText={i18n.translate('xpack.fleet.settings.elasticsearchUrlsHelpTect', {
          defaultMessage: 'Specify the Elasticsearch URLs where agents send data.',
        })}
        {...inputs.elasticsearchUrl.formRowProps}
      >
        <EuiComboBox fullWidth noSuggestions {...inputs.elasticsearchUrl.props} />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        {...inputs.additionalYamlConfig.formRowProps}
        label={i18n.translate('xpack.fleet.settings.additionalYamlConfig', {
          defaultMessage: 'Elasticsearch output configuration (YAML)',
        })}
        fullWidth
      >
        <EuiCodeEditor
          width="100%"
          mode="yaml"
          theme="textmate"
          placeholder="# YAML settings here will be added to the Elasticsearch output section of each policy"
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
    </EuiForm>
  );

  return (
    <>
      {isConfirmModalVisible && (
        <SettingsConfirmModal
          changes={changes}
          onConfirm={onConfirm}
          onClose={onConfirmModalClose}
        />
      )}
      <EuiFlyout onClose={onClose} size="m">
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
              <EuiButton
                disabled={!isUpdated}
                onClick={onSubmit}
                isLoading={isLoading}
                color="primary"
                fill
              >
                {isLoading ? (
                  <FormattedMessage
                    id="xpack.fleet.settings.saveButtonLoadingLabel"
                    defaultMessage="Applying settings..."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.fleet.settings.saveButtonLabel"
                    defaultMessage="Save and apply settings"
                  />
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </>
  );
};
