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
  EuiRadioGroup,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  kafkaAuthType,
  kafkaBrokerAckReliability,
  kafkaCompressionType,
  kafkaPartitionType,
  kafkaSaslMechanism,
  kafkaSupportedVersions,
  outputType,
} from '../../../../../../../common/constants';

import { MultiRowInput } from '../multi_row_input';
import type { Output, FleetProxy } from '../../../../types';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import { LogstashInstructions } from '../logstash_instructions';
import { useBreadcrumbs, useStartServices } from '../../../../hooks';

import { YamlCodeEditorWithPlaceholder } from './yaml_code_editor_with_placeholder';
import { useOutputForm } from './use_output_form';
import { EncryptionKeyRequiredCallout } from './encryption_key_required_callout';
import { AdvancedOptionsSection } from './advanced_options_section';

export interface EditOutputFlyoutProps {
  output?: Output;
  onClose: () => void;
  proxies: FleetProxy[];
}

const OUTPUT_TYPE_OPTIONS = [
  { value: outputType.Elasticsearch, text: 'Elasticsearch' },
  { value: outputType.Logstash, text: 'Logstash' },
  { value: outputType.Kafka, text: 'Kafka' },
];

export const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps> = ({
  onClose,
  output,
  proxies,
}) => {
  useBreadcrumbs('settings');
  const form = useOutputForm(onClose, output);
  const inputs = form.inputs;
  const { docLinks } = useStartServices();

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

  const kafkaVersionOptions = useMemo(
    () =>
      kafkaSupportedVersions.map((version) => ({
        text: version,
        label: version,
      })),
    []
  );

  const kafkaCompressionTypeOptions = useMemo(
    () =>
      (Object.keys(kafkaCompressionType) as Array<keyof typeof kafkaCompressionType>).map(
        (key) => ({
          text: kafkaCompressionType[key],
          label: kafkaCompressionType[key],
        })
      ),
    []
  );

  const kafkaBrokerTimeoutOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (i + 1) * 10).map((timeout) => ({
        text: timeout,
        label: `${timeout} seconds`,
      })),
    []
  );
  // const kafkaBrokerReachabilityTimeoutOptions = useMemo(() => {}, []);
  const kafkaBrokerChannelBufferSizeOptions = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => Math.pow(2, i + 7)).map((buffer) => ({
        text: buffer,
        label: `${buffer}`,
      })),
    []
  );
  const kafkaBrokerAckReliabilityOptions = [
    {
      text: kafkaBrokerAckReliability.Commit,
      label: 'Wait for local commit',
    },
    {
      text: kafkaBrokerAckReliability.Replicas,
      label: 'Wait for all replicas to commit',
    },
    {
      text: kafkaBrokerAckReliability.NoWait,
      label: 'Do not wait',
    },
  ];

  const kafkaCompressionLevelOptions = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => i + 1).map((level) => ({
        text: level,
        label: level.toString(),
      })),
    []
  );

  const kafkaAuthenticationsOptions = [
    {
      id: kafkaAuthType.Userpass,
      label: 'Username / Password',
      'data-test-subj': 'kafkaAuthenticationUsernamePasswordRadioButton',
    },
    {
      id: kafkaAuthType.Ssl,
      label: 'SSL',
      'data-test-subj': 'kafkaAuthenticationSSLRadioButton',
    },
    {
      id: kafkaAuthType.Kerberos,
      label: 'Kerberos',
      'data-test-subj': 'kafkaAuthenticationKerberosRadioButton',
    },
  ];

  const kafkaSaslOptions = [
    {
      id: kafkaSaslMechanism.Plain,
      label: 'Plain',
      'data-test-subj': 'kafkaSaslPlainRadioButton',
    },
    {
      id: kafkaSaslMechanism.ScramSha256,
      label: 'SCRAM-SHA-256',
      'data-test-subj': 'kafkaSaslScramSha256RadioButton',
    },
    {
      id: kafkaSaslMechanism.ScramSha512,
      label: 'SCRAM-SHA-512',
      'data-test-subj': 'kafkaSaslScramSha512RadioButton',
    },
  ];

  const kafkaPartitioningOptions = [
    {
      id: kafkaPartitionType.Random,
      label: 'Random',
      'data-test-subj': 'kafkaPartitionRandomRadioButton',
    },
    {
      id: kafkaPartitionType.RoundRobin,
      label: 'Round robin',
      'data-test-subj': 'kafkaPartitionRoundRobinRadioButton',
    },
    {
      id: kafkaPartitionType.Hash,
      label: 'Hash',
      'data-test-subj': 'kafkaPartitionHashRadioButton',
    },
  ];

  const isESOutput = inputs.typeInput.value === outputType.Elasticsearch;

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
                  <EuiLink href={docLinks.links.fleet.settings} target="_blank" external>
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
    const renderKafkaAuthenticationSection = () => {
      if (inputs.kafkaAuthMethodInput.value === kafkaAuthType.Ssl) {
        return (
          <>
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
      }
      if (inputs.kafkaAuthMethodInput.value === kafkaAuthType.Kerberos) {
        return null;
      }

      return (
        <>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaUsernameInputLabel"
                defaultMessage="Username"
              />
            }
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaUsernameInput"
              fullWidth
              {...inputs.kafkaAuthUsernameInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPasswordInputLabel"
                defaultMessage="Password"
              />
            }
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPasswordInput"
              fullWidth
              {...inputs.kafkaAuthPasswordInput.props}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaSaslInputLabel"
                defaultMessage="SASL Mechanism"
              />
            }
          >
            <EuiRadioGroup
              style={{ display: 'flex', gap: 30 }}
              data-test-subj={'settingsOutputsFlyout.kafkaSaslInput'}
              options={kafkaSaslOptions}
              compressed
              {...inputs.kafkaSaslMechanismInput.props}
            />
          </EuiFormRow>
        </>
      );
    };
    const renderKafkaPartitionTypeSection = () => {
      if (inputs.kafkaPartitionTypeInput.value === kafkaPartitionType.Random) {
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeRandomInputLabel"
                defaultMessage="Number of events"
              />
            }
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeRandomInput"
              fullWidth
              {...inputs.kafkaPartitionTypeRandomInput.props}
            />
          </EuiFormRow>
        );
      }
      if (inputs.kafkaPartitionTypeInput.value === kafkaPartitionType.RoundRobin) {
        return (
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeRoundRobinInputLabel"
                defaultMessage="Number of events"
              />
            }
          >
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeRoundRobinInput"
              fullWidth
              {...inputs.kafkaPartitionTypeRoundRobinInput.props}
            />
          </EuiFormRow>
        );
      }

      return (
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeHashInputLabel"
              defaultMessage="List of fields"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTypeHashHelpTextLabel"
              defaultMessage="Comma separated."
            />
          }
        >
          <>
            <EuiFieldText
              data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeHashInput"
              fullWidth
              {...inputs.kafkaPartitionTypeHashInput.props}
            />
          </>
        </EuiFormRow>
      );
    };

    const renderKafkaCompressionSection = () => {
      if (!inputs.kafkaCompressionInput.value) {
        return null;
      }

      return (
        <>
          <EuiSpacer size="m" />

          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionCodecInputLabel"
                defaultMessage="Codec"
              />
            }
          >
            <EuiSelect
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaCompressionCodecInputLabel"
              {...inputs.kafkaCompressionCodecInput.props}
              options={kafkaCompressionTypeOptions}
            />
          </EuiFormRow>

          {inputs.kafkaCompressionCodecInput.value === kafkaCompressionType.Gzip && (
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionLevelInputLabel"
                  defaultMessage="Level"
                />
              }
            >
              <EuiSelect
                fullWidth
                data-test-subj="settingsOutputsFlyout.kafkaCompressionInputLabel"
                {...inputs.kafkaCompressionLevelInput.props}
                options={kafkaCompressionLevelOptions}
              />
            </EuiFormRow>
          )}
        </>
      );
    };

    return (
      <>
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaVersionInputLabel"
              defaultMessage="Kafka version"
            />
          }
        >
          <EuiSelect
            fullWidth
            data-test-subj="settingsOutputsFlyout.kafkaVersionInput"
            {...inputs.kafkaVersionInput.props}
            options={kafkaVersionOptions}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.kafkaVersionInputPlaceholder',
              {
                defaultMessage: 'Specify version',
              }
            )}
          />
        </EuiFormRow>
        <MultiRowInput
          placeholder={i18n.translate(
            'xpack.fleet.settings.editOutputFlyout.kafkaHostsInputPlaceholder',
            {
              defaultMessage: 'Specify host',
            }
          )}
          sortable={false}
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.logstashHostsInputDescription"
              defaultMessage="Specify the URLs that your agents will use to connect to Kafka. For more information, see the {guideLink}."
              values={{
                guideLink: (
                  <EuiLink href={docLinks.links.fleet.settings} target="_blank" external>
                    <FormattedMessage
                      id="xpack.fleet.settings.fleetUserGuideLink"
                      defaultMessage="Fleet User Guide"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
          label={i18n.translate('xpack.fleet.settings.editOutputFlyout.kafkaHostsInputLabel', {
            defaultMessage: 'Hosts',
          })}
          {...inputs.kafkaHostsInput.props}
        />
        <EuiSpacer size="m" />
        <EuiPanel
          borderRadius="m"
          hasShadow={false}
          paddingSize={'m'}
          color={'subdued'}
          data-test-subj="settingsOutputsFlyout.kafkaAuthenticationPanel"
        >
          <EuiTitle size="s">
            <h3 id="FleetEditOutputFlyoutKafkaAuthenticationTitle">
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaAuthenticationTitle"
                defaultMessage="Authentication"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow fullWidth>
            <EuiRadioGroup
              style={{ display: 'flex', gap: 30 }}
              data-test-subj={'settingsOutputsFlyout.kafkaAuthenticationRadioInput'}
              options={kafkaAuthenticationsOptions}
              compressed
              {...inputs.kafkaAuthMethodInput.props}
            />
          </EuiFormRow>
          {renderKafkaAuthenticationSection()}
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel
          borderRadius="m"
          hasShadow={false}
          paddingSize={'m'}
          color={'subdued'}
          data-test-subj="settingsOutputsFlyout.kafkaPartitionPanel"
        >
          <EuiTitle size="s">
            <h3 id="FleetEditOutputFlyoutKafkaPartitionTitle">
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitionTitle"
                defaultMessage="Partitioning"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaPartitioningInputLabel"
                defaultMessage="Partitioning strategy"
              />
            }
          >
            <EuiRadioGroup
              style={{ display: 'flex', gap: 30 }}
              data-test-subj={'settingsOutputsFlyout.kafkaPartitioningRadioInput'}
              options={kafkaPartitioningOptions}
              compressed
              {...inputs.kafkaPartitionTypeInput.props}
            />
          </EuiFormRow>
          {renderKafkaPartitionTypeSection()}
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel
          borderRadius="m"
          hasShadow={false}
          paddingSize={'m'}
          color={'subdued'}
          data-test-subj="settingsOutputsFlyout.kafkaCompressionPanel"
        >
          <EuiTitle size="s">
            <h3 id="FleetEditOutputFlyoutKafkaCompression">
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionTitle"
                defaultMessage="Compression"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiSwitch
            {...inputs.kafkaCompressionInput.props}
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaCompressionSwitchLabel"
                defaultMessage="Enable compression"
              />
            }
          />
          {renderKafkaCompressionSection()}
        </EuiPanel>
        <EuiSpacer size="m" />

        <EuiPanel
          borderRadius="m"
          hasShadow={false}
          paddingSize={'m'}
          color={'subdued'}
          data-test-subj="settingsOutputsFlyout.kafkaBrokerSettingsPanel"
        >
          <EuiTitle size="s">
            <h3 id="FleetEditOutputFlyoutKafkaBrokerSettings">
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerSettingsTitle"
                defaultMessage="Broker settings"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerTimeoutInputLabel"
                defaultMessage="Broker timeout"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerTimeoutInputHelpText"
                defaultMessage="Define how long a Kafka server waits for data in the same cluster."
              />
            }
          >
            <EuiSelect
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaBrokerTimeoutInput"
              {...inputs.kafkaBrokerTimeoutInput.props}
              options={kafkaBrokerTimeoutOptions}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerReachabilityTimeoutInputLabel"
                defaultMessage="Broker reachability timeout"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerReachabilityTimeoutInputHelpText"
                defaultMessage="Define how long an Agent would wait for a response from Kafka broker."
              />
            }
          >
            <EuiSelect
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaBrokerReachabilityTimeoutInput"
              {...inputs.kafkaBrokerReachabilityTimeoutInput.props}
              options={kafkaBrokerTimeoutOptions}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerChannelBufferSizeInputLabel"
                defaultMessage="Channel buffer size"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerChannelBufferSizeInputHelpText"
                defaultMessage="Define the number of messages buffered in output pipeline."
              />
            }
          >
            <EuiSelect
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaBrokerChannelBufferSizeInput"
              {...inputs.kafkaBrokerChannelBufferSizeInput.props}
              options={kafkaBrokerChannelBufferSizeOptions}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerAckReliabilityInputLabel"
                defaultMessage="ACK Reliability"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.kafkaBrokerAckReliabilityInputHelpText"
                defaultMessage="Define the number of messages buffered in output pipeline."
              />
            }
          >
            <EuiSelect
              fullWidth
              data-test-subj="settingsOutputsFlyout.kafkaBrokerAckReliabilityInputLabel"
              {...inputs.kafkaBrokerAckReliabilityInput.props}
              options={kafkaBrokerAckReliabilityOptions}
            />
          </EuiFormRow>
        </EuiPanel>
        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaKeyInputLabel"
              defaultMessage="Key (optional)"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.kafkaKeyInputHelpText"
              defaultMessage="If configured, the event key can be extracted from the event using a format string."
            />
          }
        >
          <EuiFieldText
            data-test-subj="settingsOutputsFlyout.kafkaKeyInput"
            fullWidth
            {...inputs.kafkaKeyInput.props}
          />
        </EuiFormRow>
        {/* <EuiPanel*/}
        {/*  borderRadius="m"*/}
        {/*  hasShadow={false}*/}
        {/*  paddingSize={'m'}*/}
        {/*  color={'subdued'}*/}
        {/*  data-test-subj="settingsOutputsFlyout.kafkaTopicsPanel"*/}
        {/* > */}
        {/*  <EuiTitle size="s">*/}
        {/*    <h3 id="FleetEditOutputFlyoutKafkaTopicsTitle">*/}
        {/*      <FormattedMessage*/}
        {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaTopicsTitle"*/}
        {/*        defaultMessage="Topics"*/}
        {/*      />*/}
        {/*    </h3>*/}
        {/*  </EuiTitle>*/}
        {/*  <EuiSpacer size="m" />*/}
        {/* </EuiPanel>*/}
        {/* <EuiPanel*/}
        {/*  borderRadius="m"*/}
        {/*  hasShadow={false}*/}
        {/*  paddingSize={'m'}*/}
        {/*  color={'subdued'}*/}
        {/*  data-test-subj="settingsOutputsFlyout.kafkaHeadersPanel"*/}
        {/* >*/}
        {/*  <EuiTitle size="s">*/}
        {/*    <h3 id="FleetEditOutputFlyoutKafkaHeadersTitle">*/}
        {/*      <FormattedMessage*/}
        {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersTitle"*/}
        {/*        defaultMessage="Headers"*/}
        {/*      />*/}
        {/*    </h3>*/}
        {/*  </EuiTitle>*/}
        {/*  <EuiSpacer size="m" />*/}
        {/*  <MultiRowInput multiline={false} sortable={false} {...inputs.kafkaHeadersInput.props} />*/}
        {/*  <EuiFormRow*/}
        {/*    fullWidth*/}
        {/*    label={*/}
        {/*      <FormattedMessage*/}
        {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersKeyInputLabel"*/}
        {/*        defaultMessage="Key"*/}
        {/*      />*/}
        {/*    }*/}
        {/*  >*/}
        {/*    <EuiFieldText*/}
        {/*      data-test-subj="settingsOutputsFlyout.kafkaHeadersKeyInput"*/}
        {/*      fullWidth*/}
        {/*      {...inputs.kafkaHeadersKeyInput.props}*/}
        {/*    />*/}
        {/*  </EuiFormRow>*/}
        {/*  <EuiFormRow*/}
        {/*    fullWidth*/}
        {/*    label={*/}
        {/*      <FormattedMessage*/}
        {/*        id="xpack.fleet.settings.editOutputFlyout.kafkaHeadersValueLabel"*/}
        {/*        defaultMessage="Value"*/}
        {/*      />*/}
        {/*    }*/}
        {/*  >*/}
        {/*    <EuiFieldText*/}
        {/*      data-test-subj="settingsOutputsFlyout.kafkaPartitionTypeHashInput"*/}
        {/*      fullWidth*/}
        {/*      {...inputs.kafkaHeadersValueInput.props}*/}
        {/*    />*/}
        {/*  </EuiFormRow>*/}
        {/* </EuiPanel>*/}
      </>
    );
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
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.typeInputLabel"
                defaultMessage="Type"
              />
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
              {isESOutput && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiCallOut
                    title={i18n.translate(
                      'xpack.fleet.settings.editOutputFlyout.esOutputTypeCallout',
                      {
                        defaultMessage:
                          'This output type currently does not support connectivity to a remote Elasticsearch cluster.',
                      }
                    )}
                    iconType="alert"
                    color="warning"
                    size="s"
                    heading="p"
                  />
                </>
              )}
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
