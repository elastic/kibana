/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { load } from 'js-yaml';

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
  EuiSelect,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
  EuiComboBox,
  EuiText,
  EuiAccordion,
  EuiCode,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { OutputType, ValueOf } from '../../../../../../../common/types';

import {
  outputTypeSupportPresets,
  outputYmlIncludesReservedPerformanceKey,
} from '../../../../../../../common/services/output_helpers';

import { ExperimentalFeaturesService } from '../../../../../../services';

import { outputType, RESERVED_CONFIG_YML_KEYS } from '../../../../../../../common/constants';

import { MAX_FLYOUT_WIDTH } from '../../../../constants';

import type { Output, FleetProxy } from '../../../../types';

import { useBreadcrumbs, useFleetStatus, useStartServices } from '../../../../hooks';

import { ProxyWarning } from '../fleet_proxies_table/proxy_warning';

import { OutputFormKafkaSection } from './output_form_kafka';

import { YamlCodeEditorWithPlaceholder } from './yaml_code_editor_with_placeholder';
import { useOutputForm } from './use_output_form';
import { AdvancedOptionsSection } from './advanced_options_section';
import { OutputFormRemoteEsSection } from './output_form_remote_es';
import { OutputHealth } from './output_health';
import { OutputFormLogstashSection } from './output_form_logstash';
import { OutputFormElasticsearchSection } from './output_form_elasticsearch';

export interface EditOutputFlyoutProps {
  defaultOuput?: Output;
  output?: Output;
  onClose: () => void;
  proxies: FleetProxy[];
}

export const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps> = ({
  defaultOuput,
  onClose,
  output,
  proxies,
}) => {
  useBreadcrumbs('settings');
  const form = useOutputForm(onClose, output, defaultOuput);
  const inputs = form.inputs;
  const { docLinks, cloud } = useStartServices();
  const fleetStatus = useFleetStatus();

  const [secretsToggleState, setSecretsToggleState] = useState<'disabled' | true | false>(
    'disabled'
  );

  if (fleetStatus.isSecretsStorageEnabled !== undefined && secretsToggleState === 'disabled') {
    setSecretsToggleState(fleetStatus.isSecretsStorageEnabled);
  }

  const onToggleSecretStorage = (secretEnabled: boolean) => {
    if (secretsToggleState === 'disabled') {
      return;
    }

    setSecretsToggleState(secretEnabled);
  };

  const useSecretsStorage = secretsToggleState === true;

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  const { kafkaOutput: isKafkaOutputEnabled, remoteESOutput: isRemoteESOutputEnabled } =
    ExperimentalFeaturesService.get();

  const isRemoteESOutput = inputs.typeInput.value === outputType.RemoteElasticsearch;
  const isESOutput = inputs.typeInput.value === outputType.Elasticsearch;
  const supportsPresets = inputs.typeInput.value
    ? outputTypeSupportPresets(inputs.typeInput.value as ValueOf<OutputType>)
    : false;

  // Remote ES output not yet supported in serverless
  const isStateful = !cloud?.isServerlessEnabled;

  const OUTPUT_TYPE_OPTIONS = [
    { value: outputType.Elasticsearch, text: 'Elasticsearch' },
    ...(isRemoteESOutputEnabled && isStateful
      ? [{ value: outputType.RemoteElasticsearch, text: 'Remote Elasticsearch' }]
      : []),
    { value: outputType.Logstash, text: 'Logstash' },
    ...(isKafkaOutputEnabled ? [{ value: outputType.Kafka, text: 'Kafka' }] : []),
  ];

  const renderLogstashSection = () => {
    return (
      <OutputFormLogstashSection
        inputs={inputs}
        useSecretsStorage={useSecretsStorage}
        onToggleSecretStorage={onToggleSecretStorage}
        hasEncryptedSavedObjectConfigured={form.hasEncryptedSavedObjectConfigured}
      />
    );
  };

  const renderElasticsearchSection = () => {
    return <OutputFormElasticsearchSection inputs={inputs} />;
  };

  const renderRemoteElasticsearchSection = () => {
    if (isRemoteESOutputEnabled) {
      return (
        <OutputFormRemoteEsSection
          inputs={inputs}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretStorage}
        />
      );
    }
    return null;
  };

  const renderKafkaSection = () => {
    if (isKafkaOutputEnabled) {
      return (
        <OutputFormKafkaSection
          inputs={inputs}
          useSecretsStorage={useSecretsStorage}
          onToggleSecretStorage={onToggleSecretStorage}
        />
      );
    }
    return null;
  };

  const renderOutputTypeSection = (type: string) => {
    switch (type) {
      case outputType.Logstash:
        return renderLogstashSection();
      case outputType.Kafka:
        return renderKafkaSection();
      case outputType.RemoteElasticsearch:
        return renderRemoteElasticsearchSection();
      case outputType.Elasticsearch:
      default:
        return renderElasticsearchSection();
    }
  };

  const renderTypeSpecificWarning = () => {
    if (!isESOutput && !isRemoteESOutput) {
      return null;
    }

    const generateWarningMessage = () => {
      switch (inputs.typeInput.value) {
        default:
        case outputType.Elasticsearch:
          return i18n.translate('xpack.fleet.settings.editOutputFlyout.esOutputTypeCallout', {
            defaultMessage:
              'This output type does not support connectivity to a remote Elasticsearch cluster, please use the Remote Elasticsearch type for that.',
          });
      }
    };
    return isRemoteESOutput ? (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.fleet.settings.editOutputFlyout.remoteESTypeText"
            defaultMessage="Enter your output hosts, service token for your remote cluster, and any advanced YAML configuration. Learn more about how to use these parameters in {doc}."
            values={{
              doc: (
                <EuiLink href={docLinks.links.fleet.remoteESOoutput} target="_blank">
                  {i18n.translate('xpack.fleet.settings.editOutputFlyout.docLabel', {
                    defaultMessage: 'our documentation',
                  })}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </>
    ) : (
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
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH}>
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
              </>
            }
          >
            <>
              <EuiSelect
                fullWidth
                data-test-subj="settingsOutputsFlyout.typeInput"
                {...inputs.typeInput.props}
                options={OUTPUT_TYPE_OPTIONS}
              />
              {renderTypeSpecificWarning()}
            </>
          </EuiFormRow>

          {renderOutputTypeSection(inputs.typeInput.value)}

          {isRemoteESOutput ? null : (
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.proxyIdLabel"
                  defaultMessage="Proxy"
                />
              }
            >
              <>
                <EuiComboBox
                  fullWidth
                  data-test-subj="settingsOutputsFlyout.proxyIdInput"
                  {...inputs.proxyIdInput.props}
                  onChange={(options) => inputs.proxyIdInput.setValue(options?.[0]?.value ?? '')}
                  selectedOptions={
                    inputs.proxyIdInput.value !== ''
                      ? proxiesOptions.filter(
                          (option) => option.value === inputs.proxyIdInput.value
                        )
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
                <EuiSpacer size="xs" />
                <ProxyWarning />
              </>
            </EuiFormRow>
          )}
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
          {supportsPresets && (
            <>
              <EuiSpacer size="l" />
              <EuiFormRow
                fullWidth
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.performanceTuningLabel"
                    defaultMessage="Performance tuning"
                  />
                }
                helpText={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.performanceTuningHelpText"
                    defaultMessage="Performance tuning presets are curated output settings for common use cases. You can also select {custom} to specify your own settings in the Advanced YAML Configuration box below. For a detailed list of settings configured by each preset, see {link}."
                    values={{
                      custom: <strong>Custom</strong>,
                      link: (
                        <EuiLink
                          href={docLinks.links.fleet.performancePresets}
                          external
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.fleet.settings.editOutputFlyout.performanceTuningHelpTextLink"
                            defaultMessage="our documentation"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                }
              >
                <EuiSelect
                  fullWidth
                  data-test-subj="settingsOutputsFlyout.presetInput"
                  {...inputs.presetInput.props}
                  onChange={(e) => inputs.presetInput.setValue(e.target.value)}
                  disabled={
                    inputs.presetInput.props.disabled ||
                    outputYmlIncludesReservedPerformanceKey(
                      inputs.additionalYamlConfigInput.value,
                      load
                    )
                  }
                  options={[
                    { value: 'balanced', text: 'Balanced' },
                    { value: 'custom', text: 'Custom' },
                    { value: 'throughput', text: 'Throughput' },
                    { value: 'scale', text: 'Scale' },
                    { value: 'latency', text: 'Latency' },
                  ]}
                />
              </EuiFormRow>
            </>
          )}
          {supportsPresets &&
            outputYmlIncludesReservedPerformanceKey(
              inputs.additionalYamlConfigInput.value,
              load
            ) && (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut
                  color="warning"
                  iconType="alert"
                  size="s"
                  title={
                    <FormattedMessage
                      id="xpack.fleet.settings.editOutputFlyout.performanceTuningMustBeCustomWarning"
                      defaultMessage='Performance tuning preset must be "Custom" due to presence of reserved key in advanced YAML configuration'
                    />
                  }
                >
                  <EuiAccordion
                    id="performanceTuningMustBeCustomWarningDetails"
                    buttonContent={
                      <FormattedMessage
                        id="xpack.fleet.settings.editOutputFlyout.performanceTuningMustBeCustomWarningDetails"
                        defaultMessage="Show reserved keys"
                      />
                    }
                  >
                    <ul>
                      {RESERVED_CONFIG_YML_KEYS.map((key) => (
                        <li key={key}>
                          <EuiCode>{key}</EuiCode>
                        </li>
                      ))}
                    </ul>
                  </EuiAccordion>
                </EuiCallOut>
              </>
            )}

          <EuiSpacer size="l" />
          <EuiFormRow
            label={
              <EuiLink href={docLinks.links.fleet.esSettings} external target="_blank">
                {i18n.translate('xpack.fleet.settings.editOutputFlyout.yamlConfigInputLabel', {
                  defaultMessage: 'Advanced YAML configuration',
                })}
              </EuiLink>
            }
            {...inputs.additionalYamlConfigInput.formRowProps}
            fullWidth
          >
            <YamlCodeEditorWithPlaceholder
              value={inputs.additionalYamlConfigInput.value}
              onChange={(value) => {
                if (outputYmlIncludesReservedPerformanceKey(value, load)) {
                  inputs.presetInput.setValue('custom');
                }

                inputs.additionalYamlConfigInput.setValue(value);
              }}
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
          <AdvancedOptionsSection enabled={form.isShipperEnabled} inputs={inputs} />
        </EuiForm>
        {output?.id && output.type === 'remote_elasticsearch' ? (
          <OutputHealth output={output} />
        ) : null}
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
