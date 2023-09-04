/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiSelect,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
  EuiComboBox,
  EuiBetaBadge,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react/dist/emotion-react.cjs';

import { ExperimentalFeaturesService } from '../../../../../../services';

import { outputType } from '../../../../../../../common/constants';

import { MultiRowInput } from '../multi_row_input';
import type { Output, FleetProxy } from '../../../../types';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import { LogstashInstructions } from '../logstash_instructions';
import { useBreadcrumbs, useStartServices } from '../../../../hooks';

import { OutputFormKafkaSection } from './output_form_kafka';

import { YamlCodeEditorWithPlaceholder } from './yaml_code_editor_with_placeholder';
import { useOutputForm } from './use_output_form';
import { EncryptionKeyRequiredCallout } from './encryption_key_required_callout';
import { AdvancedOptionsSection } from './advanced_options_section';

export interface EditOutputFlyoutProps {
  output?: Output;
  onClose: () => void;
  proxies: FleetProxy[];
}

export const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps> = ({
  onClose,
  output,
  proxies,
}) => {
  useBreadcrumbs('settings');
  const form = useOutputForm(onClose, output);
  const inputs = form.inputs;
  const { docLinks } = useStartServices();
  const { euiTheme } = useEuiTheme();

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  const { kafkaOutput: isKafkaOutputEnabled } = ExperimentalFeaturesService.get();

  const OUTPUT_TYPE_OPTIONS = [
    { value: outputType.Elasticsearch, text: 'Elasticsearch' },
    { value: outputType.Logstash, text: 'Logstash' },
    ...(isKafkaOutputEnabled ? [{ value: outputType.Kafka, text: 'Kafka' }] : []),
  ];

  const renderLogstashSection = () => {
    return (
      <>
        {!form.hasEncryptedSavedObjectConfigured && (
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
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.sslKeyInputLabel"
              defaultMessage="Client SSL certificate key"
            />
          }
          {...inputs.sslKeyInput.formRowProps}
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
  };

  const renderElasticsearchSection = () => {
    return (
      <>
        <MultiRowInput
          data-test-subj="settingsOutputsFlyout.hostUrlInput"
          label={i18n.translate('xpack.fleet.settings.editOutputFlyout.esHostsInputLabel', {
            defaultMessage: 'Hosts',
          })}
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.esHostsInputPlaceholder',
            {
              defaultMessage: 'Specify host URL',
            }
          )}
          {...inputs.elasticsearchUrlInput.props}
          isUrl
        />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputLabel"
              defaultMessage="Elasticsearch CA trusted fingerprint (optional)"
            />
          }
          {...inputs.caTrustedFingerprintInput.formRowProps}
        >
          <EuiFieldText
            fullWidth
            {...inputs.caTrustedFingerprintInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputPlaceholder',
              {
                defaultMessage: 'Specify Elasticsearch CA trusted fingerprint',
              }
            )}
          />
        </EuiFormRow>
      </>
    );
  };

  const renderKafkaSection = () => {
    if (isKafkaOutputEnabled) {
      return <OutputFormKafkaSection inputs={inputs} />;
    }
    return null;
  };

  const renderOutputTypeSection = (type: string) => {
    switch (type) {
      case outputType.Logstash:
        return renderLogstashSection();
      case outputType.Kafka:
        return renderKafkaSection();
      case outputType.Elasticsearch:
      default:
        return renderElasticsearchSection();
    }
  };

  const renderTypeSpecificWarning = () => {
    const isESOutput = inputs.typeInput.value === outputType.Elasticsearch;
    const isKafkaOutput = inputs.typeInput.value === outputType.Kafka;
    if (!isKafkaOutput && !isESOutput) {
      return null;
    }

    const generateWarningMessage = () => {
      switch (inputs.typeInput.value) {
        case outputType.Kafka:
          return i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaOutputTypeCallout', {
            defaultMessage:
              'Kafka output is currently not supported on Agents using the Elastic Defend integration.',
          });
        default:
        case outputType.Elasticsearch:
          return i18n.translate('xpack.fleet.settings.editOutputFlyout.esOutputTypeCallout', {
            defaultMessage:
              'This output type currently does not support connectivity to a remote Elasticsearch cluster.',
          });
      }
    };
    return (
      <>
        <EuiSpacer size="xs" />
        <EuiCallOut
          data-test-subj={`settingsOutputsFlyout.${inputs.typeInput.value}OutputTypeCallout`}
          title={generateWarningMessage()}
          iconType="alert"
          color="warning"
          size="s"
          heading="p"
        />
      </>
    );
  };

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="FleetEditOutputFlyoutTitle">
            {!output ? (
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.createTitle"
                defaultMessage="Add new output"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.editTitle"
                defaultMessage="Edit output"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {output?.is_preconfigured && (
          <>
            <EuiCallOut
              iconType="lock"
              title={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.preconfiguredOutputCalloutTitle"
                  defaultMessage="This output is managed outside of Fleet"
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.preconfiguredOutputCalloutDescription"
                defaultMessage="Most actions related to this output are unavailable. Refer to your kibana config for more
                detail."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.nameInput"
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.nameInputPlaceholder',
                {
                  defaultMessage: 'Specify name',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.typeInputLabel"
                  defaultMessage="Type"
                />
                {inputs.typeInput.value === outputType.Kafka && (
                  <EuiBetaBadge
                    label={i18n.translate('xpack.fleet.settings.betaBadgeLabel', {
                      defaultMessage: 'Beta',
                    })}
                    size="s"
                    css={css`
                      margin-left: ${euiTheme.size.s};
                      color: ${euiTheme.colors.text};
                      vertical-align: middle;
                      margin-bottom: ${euiTheme.size.xxs};
                    `}
                  />
                )}
              </>
            }
          >
            <>
              <EuiSelect
                fullWidth
                data-test-subj="settingsOutputsFlyout.typeInput"
                {...inputs.typeInput.props}
                options={OUTPUT_TYPE_OPTIONS}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.typeInputPlaceholder',
                  {
                    defaultMessage: 'Specify type',
                  }
                )}
              />
              {renderTypeSpecificWarning()}
            </>
          </EuiFormRow>

          {renderOutputTypeSection(inputs.typeInput.value)}

          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.proxyIdLabel"
                defaultMessage="Proxy"
              />
            }
          >
            <EuiComboBox
              fullWidth
              data-test-subj="settingsOutputsFlyout.proxyIdInput"
              {...inputs.proxyIdInput.props}
              onChange={(options) => inputs.proxyIdInput.setValue(options?.[0]?.value ?? '')}
              selectedOptions={
                inputs.proxyIdInput.value !== ''
                  ? proxiesOptions.filter((option) => option.value === inputs.proxyIdInput.value)
                  : []
              }
              options={proxiesOptions}
              singleSelection={{ asPlainText: true }}
              isDisabled={inputs.proxyIdInput.props.disabled}
              isClearable={true}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.proxyIdPlaceholder',
                {
                  defaultMessage: 'Select proxy',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.fleet.settings.editOutputFlyout.yamlConfigInputLabel', {
              defaultMessage: 'Advanced YAML configuration',
            })}
            {...inputs.additionalYamlConfigInput.formRowProps}
            fullWidth
          >
            <YamlCodeEditorWithPlaceholder
              value={inputs.additionalYamlConfigInput.value}
              onChange={inputs.additionalYamlConfigInput.setValue}
              disabled={inputs.additionalYamlConfigInput.props.disabled}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.yamlConfigInputPlaceholder',
                {
                  defaultMessage:
                    '# YAML settings here will be added to the output section of each agent policy.',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.defaultOutputInput.formRowProps}>
            <EuiSwitch
              {...inputs.defaultOutputInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.defaultOutputSwitchLabel"
                  defaultMessage="Make this output the default for {boldAgentIntegrations}."
                  values={{
                    boldAgentIntegrations: (
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.settings.editOutputFlyout.agentIntegrationsBold"
                          defaultMessage="agent integrations"
                        />
                      </strong>
                    ),
                  }}
                />
              }
            />
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.defaultMonitoringOutputInput.formRowProps}>
            <EuiSwitch
              {...inputs.defaultMonitoringOutputInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.defaultMontoringOutputSwitchLabel"
                  defaultMessage="Make this output the default for {boldAgentMonitoring}."
                  values={{
                    boldAgentMonitoring: (
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.settings.editOutputFlyout.agentMonitoringBold"
                          defaultMessage="agent monitoring"
                        />
                      </strong>
                    ),
                  }}
                />
              }
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <AdvancedOptionsSection enabled={form.isShipperEnabled} inputs={inputs} />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={form.isLoading}
              isDisabled={form.isDisabled}
              onClick={form.submit}
              data-test-subj="saveApplySettingsBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
