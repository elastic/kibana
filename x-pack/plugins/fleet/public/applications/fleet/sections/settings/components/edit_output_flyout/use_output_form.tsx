/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  sendPostOutput,
  useComboInput,
  useInput,
  useNumberInput,
  useSwitchInput,
  useStartServices,
  sendPutOutput,
  useFleetStatus,
} from '../../../../hooks';
import type { Output, PostOutputRequest } from '../../../../types';
import { useConfirmModal } from '../../hooks/use_confirm_modal';

import {
  validateName,
  validateESHosts,
  validateLogstashHosts,
  validateYamlConfig,
  validateCATrustedFingerPrint,
  validateSSLCertificate,
  validateSSLKey,
} from './output_form_validators';
import { confirmUpdate } from './confirm_update';

const DEFAULT_QUEUE_MAX_SIZE = 4096;

export interface OutputFormInputs {
  nameInput: ReturnType<typeof useInput>;
  typeInput: ReturnType<typeof useInput>;
  elasticsearchUrlInput: ReturnType<typeof useComboInput>;
  diskQueueEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueuePathInput: ReturnType<typeof useInput>;
  diskQueueMaxSizeInput: ReturnType<typeof useNumberInput>;
  logstashHostsInput: ReturnType<typeof useComboInput>;
  additionalYamlConfigInput: ReturnType<typeof useInput>;
  defaultOutputInput: ReturnType<typeof useSwitchInput>;
  defaultMonitoringOutputInput: ReturnType<typeof useSwitchInput>;
  caTrustedFingerprintInput: ReturnType<typeof useInput>;
  sslCertificateInput: ReturnType<typeof useInput>;
  sslKeyInput: ReturnType<typeof useInput>;
  sslCertificateAuthoritiesInput: ReturnType<typeof useComboInput>;
}

export function useOutputForm(onSucess: () => void, output?: Output) {
  const fleetStatus = useFleetStatus();

  const hasEncryptedSavedObjectConfigured = !fleetStatus.missingOptionalFeatures?.includes(
    'encrypted_saved_object_encryption_key_required'
  );

  const [isLoading, setIsloading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  // preconfigured output do not allow edition
  const isPreconfigured = output?.is_preconfigured ?? false;

  // Define inputs
  // Shared inputs
  const nameInput = useInput(output?.name ?? '', validateName, isPreconfigured);
  const typeInput = useInput(output?.type ?? 'elasticsearch', undefined, isPreconfigured);
  const additionalYamlConfigInput = useInput(
    output?.config_yaml ?? '',
    validateYamlConfig,
    isPreconfigured
  );

  const defaultOutputInput = useSwitchInput(
    output?.is_default ?? false,
    isPreconfigured || output?.is_default
  );
  const defaultMonitoringOutputInput = useSwitchInput(
    output?.is_default_monitoring ?? false,
    isPreconfigured || output?.is_default_monitoring
  );

  // ES inputs
  const caTrustedFingerprintInput = useInput(
    output?.ca_trusted_fingerprint ?? '',
    validateCATrustedFingerPrint,
    isPreconfigured
  );
  const elasticsearchUrlInput = useComboInput(
    'esHostsComboxBox',
    output?.hosts ?? [],
    validateESHosts,
    isPreconfigured
  );
  // Shipper inputs - disk queue inputs are under this as well
  // Handle case where shipper.disabled: true
  const isShipperEnabled = !!output?.config_yaml?.includes('shipper');

  const diskQueueEnabledInput = useSwitchInput(output?.disk_queue_enabled ?? false);
  const diskQueuePathInput = useInput(output?.disk_queue_path ?? '');
  const diskQueueMaxSizeInput = useNumberInput(
    output?.disk_queue_max_size ?? DEFAULT_QUEUE_MAX_SIZE
  );

  // Logstash inputs
  const logstashHostsInput = useComboInput(
    'logstashHostsComboxBox',
    output?.hosts ?? [],
    validateLogstashHosts,
    isPreconfigured
  );
  const sslCertificateAuthoritiesInput = useComboInput(
    'sslCertificateAuthoritiesComboxBox',
    output?.ssl?.certificate_authorities ?? [],
    undefined,
    isPreconfigured
  );
  const sslCertificateInput = useInput(
    output?.ssl?.certificate ?? '',
    validateSSLCertificate,
    isPreconfigured
  );

  const sslKeyInput = useInput(output?.ssl?.key ?? '', validateSSLKey, isPreconfigured);

  const isLogstash = typeInput.value === 'logstash';

  const inputs: OutputFormInputs = {
    nameInput,
    typeInput,
    elasticsearchUrlInput,
    diskQueueEnabledInput,
    diskQueuePathInput,
    diskQueueMaxSizeInput,
    logstashHostsInput,
    additionalYamlConfigInput,
    defaultOutputInput,
    defaultMonitoringOutputInput,
    caTrustedFingerprintInput,
    sslCertificateInput,
    sslKeyInput,
    sslCertificateAuthoritiesInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const elasticsearchUrlsValid = elasticsearchUrlInput.validate();
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
    logstashHostsInput,
    additionalYamlConfigInput,
    caTrustedFingerprintInput,
    sslCertificateInput,
    sslKeyInput,
    diskQueuePathInput,
    isLogstash,
  ]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

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
          }
        : {
            name: nameInput.value,
            type: typeInput.value as 'elasticsearch' | 'logstash',
            hosts: elasticsearchUrlInput.value,
            is_default: defaultOutputInput.value,
            is_default_monitoring: defaultMonitoringOutputInput.value,
            config_yaml: additionalYamlConfigInput.value,
            ca_trusted_fingerprint: caTrustedFingerprintInput.value,
            disk_queue_enabled: diskQueueEnabledInput.value,
            disk_queue_path: diskQueuePathInput.value,
            disk_queue_max_size: diskQueueMaxSizeInput.value,
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
    diskQueueEnabledInput.value,
    diskQueuePathInput.value,
    diskQueueMaxSizeInput.value,
    output,
    onSucess,
    confirm,
    notifications.toasts,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    hasEncryptedSavedObjectConfigured,
    isShipperEnabled,
    isDisabled:
      isLoading ||
      isPreconfigured ||
      (output && !hasChanged) ||
      (isLogstash && !hasEncryptedSavedObjectConfigured),
  };
}
