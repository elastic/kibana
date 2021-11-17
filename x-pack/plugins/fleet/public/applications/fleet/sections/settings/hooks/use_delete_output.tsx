/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  sendDeleteOutput,
  sendGetAgentPolicies,
  sendGetAgents,
  useStartServices,
} from '../../../hooks';
import type { Output } from '../../../types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../constants';

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
    defaultMessage="This action will delete {outputName} output. It will update {policies} agent policies and {agents}. This action can not be undone. Are you sure you wish to continue?"
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
        let agentPolicyCount = 0;
        const agentPolicies = await sendGetAgentPolicies({
          kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${output.id}" or ${AGENT_POLICY_SAVED_OBJECT_TYPE}.monitoring_output_id:"${output.id}"`,
        });

        if (agentPolicies.error) {
          throw agentPolicies.error;
        }
        agentPolicyCount = agentPolicies.data?.items?.length ?? 0;

        let agentCount = 0;
        if (agentPolicyCount > 0) {
          const agents = await sendGetAgents({
            page: 1,
            perPage: 0, // We only need the count here
            showInactive: false,
            kuery: agentPolicies.data?.items
              .map((policy) => `policy_id:"${policy.id}"`)
              .join(' or '),
          });

          if (agents.error) {
            throw agents.error;
          }

          agentCount = agents.data?.total ?? 0;
        }

        const isConfirmed = await confirm(
          <ConfirmTitle />,
          <ConfirmDescription
            output={output}
            agentCount={agentCount}
            agentPolicyCount={agentPolicyCount}
          />,
          {
            buttonColor: 'danger',
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
