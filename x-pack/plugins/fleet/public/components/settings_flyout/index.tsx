/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import styled from 'styled-components';
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
  EuiCode,
  EuiLink,
  EuiPanel,
  EuiTextColor,
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
  useDefaultOutput,
  sendPutOutput,
} from '../../hooks';
import { isDiffPathProtocol, normalizeHostsForAgents } from '../../../common';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

import { SettingsConfirmModal } from './confirm_modal';
import type { SettingsConfirmModalProps } from './confirm_modal';
import { HostsInput } from './hosts_input';

const CodeEditorContainer = styled.div`
  min-height: 0;
  position: relative;
  height: 250px;
`;

const CodeEditorPlaceholder = styled(EuiTextColor).attrs((props) => ({
  color: 'subdued',
  size: 'xs',
}))`
  position: absolute;
  top: 0;
  left: 0;
  // Matches monaco editor
  font-family: Menlo, Monaco, 'Courier New', monospace;
  font-size: 12px;
  line-height: 21px;
  pointer-events: none;
`;

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

interface Props {
  onClose: () => void;
}

function normalizeHosts(hostsInput: string[]) {
  return hostsInput.map((host) => {
    try {
      return normalizeHostsForAgents(host);
    } catch (err) {
      return host;
    }
  });
}

function isSameArrayValueWithNormalizedHosts(arrayA: string[] = [], arrayB: string[] = []) {
  const hostsA = normalizeHosts(arrayA);
  const hostsB = normalizeHosts(arrayB);
  return hostsA.length === hostsB.length && hostsA.every((val, index) => val === hostsB[index]);
}

function useSettingsForm(outputId: string | undefined, onSuccess: () => void) {
  const [isLoading, setIsloading] = React.useState(false);
  const { notifications } = useStartServices();

  const fleetServerHostsInput = useComboInput('fleetServerHostsComboBox', [], (value) => {
    if (value.length === 0) {
      return [
        {
          message: i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
            defaultMessage: 'At least one URL is required',
          }),
        },
      ];
    }

    const res: Array<{ message: string; index: number }> = [];
    const hostIndexes: { [key: string]: number[] } = {};
    value.forEach((val, idx) => {
      if (!val.match(URL_REGEX)) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.fleetServerHostsError', {
            defaultMessage: 'Invalid URL',
          }),
          index: idx,
        });
      }
      const curIndexes = hostIndexes[val] || [];
      hostIndexes[val] = [...curIndexes, idx];
    });

    Object.values(hostIndexes)
      .filter(({ length }) => length > 1)
      .forEach((indexes) => {
        indexes.forEach((index) =>
          res.push({
            message: i18n.translate('xpack.fleet.settings.fleetServerHostsDuplicateError', {
              defaultMessage: 'Duplicate URL',
            }),
            index,
          })
        );
      });

    if (res.length) {
      return res;
    }

    if (value.length && isDiffPathProtocol(value)) {
      return [
        {
          message: i18n.translate(
            'xpack.fleet.settings.fleetServerHostsDifferentPathOrProtocolError',
            {
              defaultMessage: 'Protocol and path must be the same for each URL',
            }
          ),
        },
      ];
    }
  });

  const elasticsearchUrlInput = useComboInput('esHostsComboxBox', [], (value) => {
    const res: Array<{ message: string; index: number }> = [];
    const urlIndexes: { [key: string]: number[] } = {};
    value.forEach((val, idx) => {
      if (!val.match(URL_REGEX)) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.elasticHostError', {
            defaultMessage: 'Invalid URL',
          }),
          index: idx,
        });
      }
      const curIndexes = urlIndexes[val] || [];
      urlIndexes[val] = [...curIndexes, idx];
    });

    Object.values(urlIndexes)
      .filter(({ length }) => length > 1)
      .forEach((indexes) => {
        indexes.forEach((index) =>
          res.push({
            message: i18n.translate('xpack.fleet.settings.elasticHostDuplicateError', {
              defaultMessage: 'Duplicate URL',
            }),
            index,
          })
        );
      });

    if (res.length) {
      return res;
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
    const fleetServerHostsValid = fleetServerHostsInput.validate();
    const elasticsearchUrlsValid = elasticsearchUrlInput.validate();
    const additionalYamlConfigValid = additionalYamlConfigInput.validate();

    if (!fleetServerHostsValid || !elasticsearchUrlsValid || !additionalYamlConfigValid) {
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
  const { docLinks } = useStartServices();

  const settingsRequest = useGetSettings();
  const settings = settingsRequest?.data?.item;
  const { output } = useDefaultOutput();
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
      !isSameArrayValueWithNormalizedHosts(
        settings.fleet_server_hosts,
        inputs.fleetServerHosts.value
      ) ||
      !isSameArrayValueWithNormalizedHosts(output.hosts, inputs.elasticsearchUrl.value) ||
      (output.config_yaml || '') !== inputs.additionalYamlConfig.value
    );
  }, [settings, inputs, output]);

  const changes = React.useMemo(() => {
    if (!settings || !output || !isConfirmModalVisible) {
      return [];
    }

    const tmpChanges: SettingsConfirmModalProps['changes'] = [];
    if (!isSameArrayValueWithNormalizedHosts(output.hosts, inputs.elasticsearchUrl.value)) {
      tmpChanges.push(
        {
          type: 'elasticsearch',
          direction: 'removed',
          urls: normalizeHosts(output.hosts || []),
        },
        {
          type: 'elasticsearch',
          direction: 'added',
          urls: normalizeHosts(inputs.elasticsearchUrl.value),
        }
      );
    }

    if (
      !isSameArrayValueWithNormalizedHosts(
        settings.fleet_server_hosts,
        inputs.fleetServerHosts.value
      )
    ) {
      tmpChanges.push(
        {
          type: 'fleet_server',
          direction: 'removed',
          urls: normalizeHosts(settings.fleet_server_hosts || []),
        },
        {
          type: 'fleet_server',
          direction: 'added',
          urls: normalizeHosts(inputs.fleetServerHosts.value),
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
      <EuiPanel hasShadow={false} hasBorder={true}>
        <HostsInput
          {...inputs.fleetServerHosts.props}
          label={i18n.translate('xpack.fleet.settings.fleetServerHostsLabel', {
            defaultMessage: 'Fleet Server hosts',
          })}
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHostsHelpTect"
              defaultMessage="Specify the URLs that your agents will use to connect to a Fleet Server. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Fleet Server uses port 8220 by default. Refer to the {link}."
              values={{
                link: (
                  <EuiLink
                    href={docLinks.links.fleet.settingsFleetServerHostSettings}
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.fleet.settings.userGuideLink"
                      defaultMessage="Fleet and Elastic Agent Guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <HostsInput
          {...inputs.elasticsearchUrl.props}
          label={i18n.translate('xpack.fleet.settings.elasticsearchUrlLabel', {
            defaultMessage: 'Elasticsearch hosts',
          })}
          helpText={i18n.translate('xpack.fleet.settings.elasticsearchUrlsHelpTect', {
            defaultMessage:
              'Specify the Elasticsearch URLs where agents send data. Elasticsearch uses port 9200 by default.',
          })}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiFormRow
          {...inputs.additionalYamlConfig.formRowProps}
          label={i18n.translate('xpack.fleet.settings.additionalYamlConfig', {
            defaultMessage: 'Elasticsearch output configuration (YAML)',
          })}
          fullWidth
        >
          <CodeEditorContainer>
            <CodeEditor
              languageId="yaml"
              width="100%"
              height="250px"
              value={inputs.additionalYamlConfig.value}
              onChange={inputs.additionalYamlConfig.setValue}
              options={{
                minimap: {
                  enabled: false,
                },

                ariaLabel: i18n.translate('xpack.fleet.settings.yamlCodeEditor', {
                  defaultMessage: 'YAML Code Editor',
                }),
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
                tabSize: 2,
                // To avoid left margin
                lineNumbers: 'off',
                lineNumbersMinChars: 0,
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
              }}
            />
            {(!inputs.additionalYamlConfig.value || inputs.additionalYamlConfig.value === '') && (
              <CodeEditorPlaceholder>
                {`# YAML settings here will be added to the Elasticsearch output section of each policy`}
              </CodeEditorPlaceholder>
            )}
          </CodeEditorContainer>
        </EuiFormRow>
      </EuiPanel>
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
