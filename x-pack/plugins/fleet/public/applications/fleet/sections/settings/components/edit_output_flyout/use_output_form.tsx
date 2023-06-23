/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';

import type { KafkaOutput } from '../../../../../../../common/types/models';

import {
  kafkaAuthType,
  kafkaBrokerAckReliability,
  kafkaCompressionType,
  kafkaPartitionType,
  kafkaSaslMechanism,
  outputType,
} from '../../../../../../../common/constants';

import {
  sendPostOutput,
  useComboInput,
  useInput,
  useNumberInput,
  useSelectInput,
  useSwitchInput,
  useStartServices,
  sendPutOutput,
  useFleetStatus,
  useRadioInput,
} from '../../../../hooks';
import type { Output, PostOutputRequest } from '../../../../types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { ExperimentalFeaturesService } from '../../../../services';

import {
  validateName,
  validateESHosts,
  validateLogstashHosts,
  validateYamlConfig,
  validateCATrustedFingerPrint,
  validateSSLCertificate,
  validateSSLKey,
  validateKafkaUsername,
  validateKafkaPassword,
} from './output_form_validators';
import { confirmUpdate } from './confirm_update';

const DEFAULT_QUEUE_MAX_SIZE = 4096;

export interface OutputFormInputsType {
  nameInput: ReturnType<typeof useInput>;
  typeInput: ReturnType<typeof useInput>;
  elasticsearchUrlInput: ReturnType<typeof useComboInput>;
  diskQueueEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueuePathInput: ReturnType<typeof useInput>;
  diskQueueMaxSizeInput: ReturnType<typeof useNumberInput>;
  diskQueueEncryptionEnabled: ReturnType<typeof useSwitchInput>;
  diskQueueCompressionEnabled: ReturnType<typeof useSwitchInput>;
  compressionLevelInput: ReturnType<typeof useSelectInput>;
  logstashHostsInput: ReturnType<typeof useComboInput>;
  additionalYamlConfigInput: ReturnType<typeof useInput>;
  defaultOutputInput: ReturnType<typeof useSwitchInput>;
  defaultMonitoringOutputInput: ReturnType<typeof useSwitchInput>;
  caTrustedFingerprintInput: ReturnType<typeof useInput>;
  sslCertificateInput: ReturnType<typeof useInput>;
  sslKeyInput: ReturnType<typeof useInput>;
  sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
  proxyIdInput: ReturnType<typeof useInput>;
  loadBalanceEnabledInput: ReturnType<typeof useSwitchInput>;
  memQueueEvents: ReturnType<typeof useNumberInput>;
  queueFlushTimeout: ReturnType<typeof useNumberInput>;
  maxBatchBytes: ReturnType<typeof useNumberInput>;
  kafkaHostsInput: ReturnType<typeof useComboInput>;
  kafkaVersionInput: ReturnType<typeof useInput>;
  kafkaAuthMethodInput: ReturnType<typeof useRadioInput>;
  kafkaSaslMechanismInput: ReturnType<typeof useRadioInput>;
  kafkaAuthUsernameInput: ReturnType<typeof useInput>;
  kafkaAuthPasswordInput: ReturnType<typeof useInput>;
  kafkaPartitionTypeInput: ReturnType<typeof useRadioInput>;
  kafkaPartitionTypeRandomInput: ReturnType<typeof useInput>;
  kafkaPartitionTypeHashInput: ReturnType<typeof useInput>;
  kafkaHeadersKeyInput: ReturnType<typeof useInput>;
  kafkaHeadersValueInput: ReturnType<typeof useInput>;
  kafkaPartitionTypeRoundRobinInput: ReturnType<typeof useInput>;
  kafkaHeadersInput: ReturnType<typeof useComboInput>;
  kafkaCompressionInput: ReturnType<typeof useSwitchInput>;
  kafkaCompressionLevelInput: ReturnType<typeof useInput>;
  kafkaCompressionCodecInput: ReturnType<typeof useInput>;
  kafkaBrokerTimeoutInput: ReturnType<typeof useInput>;
  kafkaBrokerReachabilityTimeoutInput: ReturnType<typeof useInput>;
  kafkaBrokerChannelBufferSizeInput: ReturnType<typeof useInput>;
  kafkaBrokerAckReliabilityInput: ReturnType<typeof useInput>;
  kafkaKeyInput: ReturnType<typeof useInput>;
}

export function useOutputForm(onSucess: () => void, output?: Output) {
  const fleetStatus = useFleetStatus();

  const { showExperimentalShipperOptions } = ExperimentalFeaturesService.get();

  const hasEncryptedSavedObjectConfigured = !fleetStatus.missingOptionalFeatures?.includes(
    'encrypted_saved_object_encryption_key_required'
  );

  const [isLoading, setIsloading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  // preconfigured output do not allow edition
  const isPreconfigured = output?.is_preconfigured ?? false;
  const allowEdit = output?.allow_edit ?? [];

  function isDisabled(field: keyof Output | keyof KafkaOutput) {
    if (!isPreconfigured) {
      return false;
    }
    return !allowEdit.includes(field);
  }

  // Define inputs
  // Shared inputs
  const nameInput = useInput(output?.name ?? '', validateName, isDisabled('name'));
  const typeInput = useInput(output?.type ?? 'elasticsearch', undefined, isDisabled('type'));
  const additionalYamlConfigInput = useInput(
    output?.config_yaml ?? '',
    validateYamlConfig,
    isDisabled('config_yaml')
  );

  const defaultOutputInput = useSwitchInput(
    output?.is_default ?? false,
    isDisabled('is_default') || output?.is_default
  );
  const defaultMonitoringOutputInput = useSwitchInput(
    output?.is_default_monitoring ?? false,
    isDisabled('is_default_monitoring') || output?.is_default_monitoring
  );

  // ES inputs
  const caTrustedFingerprintInput = useInput(
    output?.ca_trusted_fingerprint ?? '',
    validateCATrustedFingerPrint,
    isDisabled('ca_trusted_fingerprint')
  );
  const elasticsearchUrlInput = useComboInput(
    'esHostsComboxBox',
    output?.hosts ?? [],
    validateESHosts,
    isDisabled('hosts')
  );
  /*
  Shipper feature flag - currently depends on the content of the yaml
  # Enables the shipper:
  shipper: {}

  # Also enables the shipper:
  shipper:
    enabled: true

  # Yet another way of enabling it:
  shipper:
    queue:
      ...

  # Disables the shipper
  shipper:
    enabled: false
  */
  const configJs = output?.config_yaml ? safeLoad(output?.config_yaml) : {};
  const isShipperDisabled = !configJs?.shipper || configJs?.shipper?.enabled === false;

  const diskQueueEnabledInput = useSwitchInput(output?.shipper?.disk_queue_enabled ?? false);
  const diskQueuePathInput = useInput(
    output?.shipper?.disk_queue_path ?? '',
    undefined,
    !diskQueueEnabledInput.value ?? false
  );
  const diskQueueMaxSizeInput = useNumberInput(
    output?.shipper?.disk_queue_max_size ?? DEFAULT_QUEUE_MAX_SIZE,
    undefined,
    !diskQueueEnabledInput.value ?? false
  );
  const diskQueueEncryptionEnabled = useSwitchInput(
    output?.shipper?.disk_queue_encryption_enabled ?? false,
    !diskQueueEnabledInput.value ?? false
  );
  const loadBalanceEnabledInput = useSwitchInput(output?.shipper?.disk_queue_enabled ?? false);
  const diskQueueCompressionEnabled = useSwitchInput(
    output?.shipper?.disk_queue_compression_enabled ?? false
  );

  const options = Array.from(Array(10).keys())
    .slice(1)
    .map((val) => {
      return { value: `${val}`, text: `Level ${val}` };
    });
  const compressionLevelInput = useSelectInput(
    options,
    `${output?.shipper?.compression_level}` ?? options[0].value,
    !diskQueueCompressionEnabled.value ?? false
  );

  const memQueueEvents = useNumberInput(output?.shipper?.mem_queue_events || undefined);
  const queueFlushTimeout = useNumberInput(output?.shipper?.queue_flush_timeout || undefined);
  const maxBatchBytes = useNumberInput(output?.shipper?.max_batch_bytes || undefined);

  const isSSLEditable = isDisabled('ssl');
  // Logstash inputs
  const logstashHostsInput = useComboInput(
    'logstashHostsComboxBox',
    output?.hosts ?? [],
    validateLogstashHosts,
    isDisabled('hosts')
  );
  const sslCertificateAuthoritiesInput = useComboInput(
    'sslCertificateAuthoritiesComboxBox',
    output?.ssl?.certificate_authorities ?? [],
    undefined,
    isSSLEditable
  );
  const sslCertificateInput = useInput(
    output?.ssl?.certificate ?? '',
    validateSSLCertificate,
    isSSLEditable
  );
  const sslKeyInput = useInput(output?.ssl?.key ?? '', validateSSLKey, isSSLEditable);

  const proxyIdInput = useInput(output?.proxy_id ?? '', () => undefined, isDisabled('proxy_id'));

  /**
   * Kafka inputs
   */

  const kafkaOutput = output as KafkaOutput;

  const kafkaVersionInput = useInput(
    kafkaOutput?.version ?? '1.0.0',
    undefined,
    isDisabled('version')
  );

  const kafkaHostsInput = useComboInput(
    'kafkaHostsComboxBox',
    output?.hosts ?? [],
    validateESHosts,
    isDisabled('hosts')
  );

  const kafkaAuthMethodInput = useRadioInput(
    kafkaOutput?.auth_type ?? kafkaAuthType.Userpass,
    isDisabled('auth_type')
  );

  const kafkaAuthUsernameInput = useInput(
    kafkaOutput?.username ?? '',
    validateKafkaUsername,
    isDisabled('username')
  );
  const kafkaAuthPasswordInput = useInput(
    kafkaOutput?.password ?? '',
    validateKafkaPassword,
    isDisabled('password')
  );

  const kafkaSaslMechanismInput = useRadioInput(
    kafkaOutput?.sasl?.mechanism ?? kafkaSaslMechanism.Plain,
    isDisabled('sasl')
  );

  const kafkaPartitionTypeInput = useRadioInput(
    kafkaOutput?.partition ?? kafkaPartitionType.Random,
    isDisabled('partition')
  );

  const kafkaPartitionTypeRandomInput = useInput(
    `${kafkaOutput?.random?.group_events ?? ''}`,
    undefined,
    isDisabled('partition')
  );
  const kafkaPartitionTypeHashInput = useInput(
    kafkaOutput?.hash?.hash ?? '',
    undefined,
    isDisabled('partition')
  );
  const kafkaPartitionTypeRoundRobinInput = useInput(
    `${kafkaOutput?.round_robin?.group_events ?? ''}`,
    undefined,
    isDisabled('partition')
  );
  const kafkaHeadersInput = useComboInput(
    'kafkaHeadersComboBox',
    [],
    undefined,
    isDisabled('headers')
  ); // TODO: validate headers
  const kafkaHeadersKeyInput = useInput('', undefined, isDisabled('headers' as any));
  const kafkaHeadersValueInput = useInput('', undefined, isDisabled('headers' as any));

  const kafkaCompressionInput = useSwitchInput(
    !!kafkaOutput?.compression,
    isDisabled('compression')
  );
  const kafkaCompressionLevelInput = useInput(
    `${kafkaOutput?.compression_level ?? 4}`,
    undefined,
    isDisabled('compression_level')
  );
  const kafkaCompressionCodecInput = useInput(
    kafkaOutput?.compression ?? kafkaCompressionType.Gzip,
    undefined,
    isDisabled('compression')
  );

  const kafkaBrokerTimeoutInput = useInput(
    `${kafkaOutput?.broker_timeout ?? 30}`,
    undefined,
    isDisabled('broker_timeout')
  );

  const kafkaBrokerReachabilityTimeoutInput = useInput(
    `${kafkaOutput?.timeout ?? 30}`,
    undefined,
    isDisabled('timeout')
  );

  // TODO:
  const kafkaBrokerChannelBufferSizeInput = useInput(
    (output as any)?.broker_channel_buffer_size ?? 256,
    undefined,
    isDisabled('broker_channel_buffer_size' as any)
  );

  const kafkaBrokerAckReliabilityInput = useInput(
    (output as any)?.broker_ack_replicas ?? kafkaBrokerAckReliability.Commit,
    undefined,
    isDisabled('broker_ack_replicas' as any)
  );

  const kafkaKeyInput = useInput(kafkaOutput?.key ?? '', undefined, isDisabled('key'));

  const isLogstash = typeInput.value === outputType.Logstash;
  const isKafka = typeInput.value === outputType.Kafka;

  const inputs: OutputFormInputsType = {
    nameInput,
    typeInput,
    elasticsearchUrlInput,
    diskQueueEnabledInput,
    diskQueuePathInput,
    diskQueueEncryptionEnabled,
    diskQueueMaxSizeInput,
    diskQueueCompressionEnabled,
    compressionLevelInput,
    logstashHostsInput,
    additionalYamlConfigInput,
    defaultOutputInput,
    defaultMonitoringOutputInput,
    caTrustedFingerprintInput,
    sslCertificateInput,
    sslKeyInput,
    sslCertificateAuthoritiesInput,
    proxyIdInput,
    loadBalanceEnabledInput,
    memQueueEvents,
    queueFlushTimeout,
    maxBatchBytes,
    kafkaVersionInput,
    kafkaHostsInput,
    kafkaAuthMethodInput,
    kafkaAuthUsernameInput,
    kafkaAuthPasswordInput,
    kafkaSaslMechanismInput,
    kafkaPartitionTypeInput,
    kafkaPartitionTypeRandomInput,
    kafkaPartitionTypeHashInput,
    kafkaPartitionTypeRoundRobinInput,
    kafkaHeadersInput,
    kafkaHeadersKeyInput,
    kafkaHeadersValueInput,
    kafkaCompressionInput,
    kafkaCompressionLevelInput,
    kafkaCompressionCodecInput,
    kafkaBrokerTimeoutInput,
    kafkaBrokerReachabilityTimeoutInput,
    kafkaBrokerChannelBufferSizeInput,
    kafkaBrokerAckReliabilityInput,
    kafkaKeyInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const elasticsearchUrlsValid = elasticsearchUrlInput.validate();
    const kafkaHostsValid = kafkaHostsInput.validate();
    const kafkaUsernameValid = kafkaAuthUsernameInput.validate();
    const kafkaPasswordValid = kafkaAuthPasswordInput.validate();
    const logstashHostsValid = logstashHostsInput.validate();
    const additionalYamlConfigValid = additionalYamlConfigInput.validate();
    const caTrustedFingerprintValid = caTrustedFingerprintInput.validate();
    const sslCertificateValid = sslCertificateInput.validate();
    const sslKeyValid = sslKeyInput.validate();
    const diskQueuePathValid = diskQueuePathInput.validate();

    if (isLogstash) {
      // validate logstash
      return (
        logstashHostsValid &&
        additionalYamlConfigValid &&
        nameInputValid &&
        sslCertificateValid &&
        sslKeyValid
      );
    }
    if (isKafka) {
      // validate kafka
      return (
        additionalYamlConfigValid &&
        nameInputValid &&
        kafkaHostsValid &&
        kafkaUsernameValid &&
        kafkaPasswordValid
      );
    } else {
      // validate ES
      return (
        elasticsearchUrlsValid &&
        additionalYamlConfigValid &&
        nameInputValid &&
        caTrustedFingerprintValid &&
        diskQueuePathValid
      );
    }
  }, [
    nameInput,
    elasticsearchUrlInput,
    kafkaHostsInput,
    kafkaAuthUsernameInput,
    kafkaAuthPasswordInput,
    logstashHostsInput,
    additionalYamlConfigInput,
    caTrustedFingerprintInput,
    sslCertificateInput,
    sslKeyInput,
    diskQueuePathInput,
    isLogstash,
    isKafka,
  ]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      let shipperParams = {};

      if (!isShipperDisabled) {
        shipperParams = {
          shipper: {
            mem_queue_events: memQueueEvents.value ? Number(memQueueEvents.value) : null,
            queue_flush_timeout: queueFlushTimeout.value ? Number(queueFlushTimeout.value) : null,
            max_batch_bytes: maxBatchBytes.value ? Number(maxBatchBytes.value) : null,
          },
        };
      }

      if (!isShipperDisabled && showExperimentalShipperOptions) {
        shipperParams = {
          ...shipperParams,
          shipper: {
            disk_queue_enabled: diskQueueEnabledInput.value,
            disk_queue_path:
              diskQueueEnabledInput.value && diskQueuePathInput.value
                ? diskQueuePathInput.value
                : '',
            disk_queue_max_size:
              diskQueueEnabledInput.value && diskQueueMaxSizeInput.value
                ? diskQueueMaxSizeInput.value
                : null,
            disk_queue_encryption_enabled:
              diskQueueEnabledInput.value && diskQueueEncryptionEnabled.value,
            disk_queue_compression_enabled: diskQueueCompressionEnabled.value,
            compression_level: diskQueueCompressionEnabled.value
              ? Number(compressionLevelInput.value)
              : null,
            loadbalance: loadBalanceEnabledInput.value,
          },
        };
      }

      const proxyIdValue = proxyIdInput.value !== '' ? proxyIdInput.value : null;
      const data: PostOutputRequest['body'] = isLogstash
        ? {
            name: nameInput.value,
            type: typeInput.value as 'elasticsearch' | 'logstash',
            hosts: logstashHostsInput.value,
            is_default: defaultOutputInput.value,
            is_default_monitoring: defaultMonitoringOutputInput.value,
            config_yaml: additionalYamlConfigInput.value,
            ssl: {
              certificate: sslCertificateInput.value,
              key: sslKeyInput.value,
              certificate_authorities: sslCertificateAuthoritiesInput.value.filter(
                (val) => val !== ''
              ),
            },
            proxy_id: proxyIdValue,
            ...shipperParams,
          }
        : {
            name: nameInput.value,
            type: typeInput.value as 'elasticsearch' | 'logstash',
            hosts: elasticsearchUrlInput.value,
            is_default: defaultOutputInput.value,
            is_default_monitoring: defaultMonitoringOutputInput.value,
            config_yaml: additionalYamlConfigInput.value,
            ca_trusted_fingerprint: caTrustedFingerprintInput.value,
            proxy_id: proxyIdValue,
            ...shipperParams,
          };

      if (output) {
        // Update
        if (!(await confirmUpdate(output, confirm))) {
          setIsloading(false);
          return;
        }

        const res = await sendPutOutput(output.id, data);
        if (res.error) {
          throw res.error;
        }
      } else {
        // Create
        const res = await sendPostOutput(data);
        if (res.error) {
          throw res.error;
        }
      }

      onSucess();
      setIsloading(false);
    } catch (err) {
      setIsloading(false);
      notifications.toasts.addError(err, {
        title: i18n.translate('xpack.fleet.settings.outputForm.errorToastTitle', {
          defaultMessage: 'Error while saving output',
        }),
      });
    }
  }, [
    validate,
    isShipperDisabled,
    showExperimentalShipperOptions,
    proxyIdInput.value,
    isLogstash,
    nameInput.value,
    typeInput.value,
    logstashHostsInput.value,
    defaultOutputInput.value,
    defaultMonitoringOutputInput.value,
    additionalYamlConfigInput.value,
    sslCertificateInput.value,
    sslKeyInput.value,
    sslCertificateAuthoritiesInput.value,
    elasticsearchUrlInput.value,
    caTrustedFingerprintInput.value,
    output,
    onSucess,
    memQueueEvents.value,
    queueFlushTimeout.value,
    maxBatchBytes.value,
    diskQueueEnabledInput.value,
    diskQueuePathInput.value,
    diskQueueMaxSizeInput.value,
    diskQueueEncryptionEnabled.value,
    diskQueueCompressionEnabled.value,
    compressionLevelInput.value,
    loadBalanceEnabledInput.value,
    confirm,
    notifications.toasts,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    hasEncryptedSavedObjectConfigured,
    isShipperEnabled: !isShipperDisabled,
    isDisabled:
      isLoading || (output && !hasChanged) || (isLogstash && !hasEncryptedSavedObjectConfigured),
  };
}
