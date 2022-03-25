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
  useSwitchInput,
  useStartServices,
  sendPutOutput,
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

export function useOutputForm(onSucess: () => void, output?: Output) {
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

  const inputs = {
    nameInput,
    typeInput,
    elasticsearchUrlInput,
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
        caTrustedFingerprintValid
      );
    }
  }, [
    isLogstash,
    nameInput,
    sslCertificateInput,
    sslKeyInput,
    elasticsearchUrlInput,
    logstashHostsInput,
    additionalYamlConfigInput,
    caTrustedFingerprintInput,
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
    isLogstash,
    validate,
    confirm,
    additionalYamlConfigInput.value,
    defaultMonitoringOutputInput.value,
    defaultOutputInput.value,
    elasticsearchUrlInput.value,
    logstashHostsInput.value,
    caTrustedFingerprintInput.value,
    sslCertificateInput.value,
    sslCertificateAuthoritiesInput.value,
    sslKeyInput.value,
    nameInput.value,
    typeInput.value,

    notifications.toasts,
    onSucess,
    output,
  ]);

  return {
    inputs,
    submit,
    isLoading,
    isDisabled: isLoading || isPreconfigured || (output && !hasChanged),
  };
}
