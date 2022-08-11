/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { sendDeleteOutput, useStartServices } from '../../../hooks';
import type { Output } from '../../../types';
import { getAgentAndPolicyCountForOutput } from '../services/agent_and_policies_count';

import { useConfirmModal } from './use_confirm_modal';

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.deleteOutput.confirmModalTitle"
    defaultMessage="Delete and deploy changes?"
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
    id="xpack.fleet.settings.deleteOutput.confirmModalText"
    defaultMessage="This action will delete {outputName} output. It will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
    values={{
      outputName: <strong>{output.name}</strong>,
      agents: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.deleteOutput.agentsCount"
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
            id="xpack.fleet.settings.deleteOutput.agentPolicyCount"
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

export function useDeleteOutput(onSuccess: () => void) {
  const { confirm } = useConfirmModal();
  const { notifications } = useStartServices();
  const deleteOutput = useCallback(
    async (output: Output) => {
      try {
        const { agentCount, agentPolicyCount } = await getAgentAndPolicyCountForOutput(output);

        const isConfirmed = await confirm(
          <ConfirmTitle />,
          <ConfirmDescription
            output={output}
            agentCount={agentCount}
            agentPolicyCount={agentPolicyCount}
          />,
          {
            buttonColor: 'danger',
            confirmButtonText: i18n.translate(
              'xpack.fleet.settings.deleteOutputs.confirmButtonLabel',
              {
                defaultMessage: 'Delete and deploy',
              }
            ),
          }
        );

        if (!isConfirmed) {
          return;
        }

        const res = await sendDeleteOutput(output.id);

        if (res.error) {
          throw res.error;
        }

        onSuccess();
      } catch (err) {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.settings.deleteOutputs.errorToastTitle', {
            defaultMessage: 'Error deleting output',
          }),
        });
      }
    },
    [confirm, notifications.toasts, onSuccess]
  );

  return { deleteOutput };
}
