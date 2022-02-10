/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

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
import { getAgentAndPolicyCountForOutput } from '../../services/agent_and_policies_count';

import {
  validateName,
  validateHosts,
  validateYamlConfig,
  validateCATrustedFingerPrint,
} from './output_form_validators';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.updateOutput.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

interface ConfirmDescriptionProps {
  output: Output;
  agentCount: number;
  agentPolicyCount: number;
}

const ConfirmDescription: React.FunctionComponent<ConfirmDescriptionProps> = ({
  output,
  agentCount,
  agentPolicyCount,
}) => (
  <FormattedMessage
    id="xpack.fleet.settings.updateOutput.confirmModalText"
    defaultMessage="This action will update {outputName} output. It will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
    values={{
      outputName: <strong>{output.name}</strong>,
      agents: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.updateOutput.agentsCount"
            defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
            values={{
              agentCount,
            }}
          />
        </strong>
      ),
      policies: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.updateOutput.agentPolicyCount"
            defaultMessage="{agentPolicyCount, plural, one {# agent policy} other {# agent policies}}"
            values={{
              agentPolicyCount,
            }}
          />
        </strong>
      ),
    }}
  />
);

async function confirmUpdate(
  output: Output,
  confirm: ReturnType<typeof useConfirmModal>['confirm']
) {
  const { agentCount, agentPolicyCount } = await getAgentAndPolicyCountForOutput(output);
  return confirm(
    <ConfirmTitle />,
    <ConfirmDescription
      agentCount={agentCount}
      agentPolicyCount={agentPolicyCount}
      output={output}
    />
  );
}

export function useOutputForm(onSucess: () => void, output?: Output) {
  const [isLoading, setIsloading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  // preconfigured output do not allow edition
  const isPreconfigured = output?.is_preconfigured ?? false;

  // Define inputs
  const nameInput = useInput(output?.name ?? '', validateName, isPreconfigured);
  const typeInput = useInput(output?.type ?? '', undefined, isPreconfigured);
  const elasticsearchUrlInput = useComboInput(
    'esHostsComboxBox',
    output?.hosts ?? [],
    validateHosts,
    isPreconfigured
  );
  const additionalYamlConfigInput = useInput(
    output?.config_yaml ?? '',
    validateYamlConfig,
    isPreconfigured
  );

  const caTrustedFingerprintInput = useInput(
    output?.ca_trusted_fingerprint ?? '',
    validateCATrustedFingerPrint,
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

  const inputs = {
    nameInput,
    typeInput,
    elasticsearchUrlInput,
    additionalYamlConfigInput,
    defaultOutputInput,
    defaultMonitoringOutputInput,
    caTrustedFingerprintInput,
  };

  const hasChanged = Object.values(inputs).some((input) => input.hasChanged);

  const validate = useCallback(() => {
    const nameInputValid = nameInput.validate();
    const elasticsearchUrlsValid = elasticsearchUrlInput.validate();
    const additionalYamlConfigValid = additionalYamlConfigInput.validate();
    const caTrustedFingerprintValid = caTrustedFingerprintInput.validate();

    if (
      !elasticsearchUrlsValid ||
      !additionalYamlConfigValid ||
      !nameInputValid ||
      !caTrustedFingerprintValid
    ) {
      return false;
    }

    return true;
  }, [nameInput, elasticsearchUrlInput, additionalYamlConfigInput, caTrustedFingerprintInput]);

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      setIsloading(true);

      const data: PostOutputRequest['body'] = {
        name: nameInput.value,
        type: 'elasticsearch',
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
    validate,
    confirm,
    additionalYamlConfigInput.value,
    defaultMonitoringOutputInput.value,
    defaultOutputInput.value,
    elasticsearchUrlInput.value,
    caTrustedFingerprintInput.value,
    nameInput.value,
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
