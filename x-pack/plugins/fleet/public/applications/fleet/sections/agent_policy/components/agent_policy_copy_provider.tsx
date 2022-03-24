/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy } from '../../../types';
import { sendCopyAgentPolicy, useStartServices } from '../../../hooks';

interface Props {
  children: (copyAgentPolicy: CopyAgentPolicy) => React.ReactElement;
}

export type CopyAgentPolicy = (agentPolicy: AgentPolicy, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (newAgentPolicy: AgentPolicy) => void;

export const AgentPolicyCopyProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useStartServices();
  const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>();
  const [newAgentPolicy, setNewAgentPolicy] = useState<Pick<AgentPolicy, 'name' | 'description'>>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const copyAgentPolicyPrompt: CopyAgentPolicy = (
    agentPolicyToCopy,
    onSuccess = () => undefined
  ) => {
    if (!agentPolicyToCopy) {
      throw new Error('No agent policy specified to duplicate');
    }
    setIsModalOpen(true);
    setAgentPolicy(agentPolicyToCopy);
    setNewAgentPolicy({
      name: i18n.translate('xpack.fleet.copyAgentPolicy.confirmModal.defaultNewPolicyName', {
        defaultMessage: '{name} (copy)',
        values: { name: agentPolicyToCopy.name },
      }),
      description: agentPolicyToCopy.description,
    });
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentPolicy(undefined);
    setNewAgentPolicy(undefined);
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const copyAgentPolicy = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await sendCopyAgentPolicy(agentPolicy!.id, newAgentPolicy!);

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Error duplicating agent policy: no data');
      }

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.copyAgentPolicy.successNotificationTitle', {
          defaultMessage: 'Agent policy duplicated',
        })
      );
      closeModal();
      if (onSuccessCallback.current) {
        onSuccessCallback.current(data.item);
      }
    } catch (e) {
      setIsLoading(false);
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.fleet.copyAgentPolicy.fatalErrorNotificationTitle', {
          defaultMessage: 'Error duplicating agent policy',
        }),
      });
    }
  };

  const renderModal = () => {
    if (!isModalOpen || !agentPolicy || !newAgentPolicy) {
      return null;
    }

    return (
      <EuiConfirmModal
        title={
          <span className="eui-textBreakWord">
            <FormattedMessage
              id="xpack.fleet.copyAgentPolicy.confirmModal.copyPolicyTitle"
              defaultMessage="Duplicate '{name}' agent policy"
              values={{
                name: agentPolicy.name,
              }}
            />
          </span>
        }
        onCancel={closeModal}
        onConfirm={copyAgentPolicy}
        cancelButtonText={
          <FormattedMessage
            id="xpack.fleet.copyAgentPolicy.confirmModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.fleet.copyAgentPolicy.confirmModal.confirmButtonLabel"
            defaultMessage="Duplicate policy"
          />
        }
        confirmButtonDisabled={isLoading || !newAgentPolicy.name.trim()}
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.copyAgentPolicy.confirmModal.copyPolicyPrompt"
            defaultMessage="Choose a name and description for your new agent policy."
          />
        </p>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fleet.copyAgentPolicy.confirmModal.newNameLabel"
              defaultMessage="New policy name"
            />
          }
          fullWidth
        >
          <EuiFieldText
            fullWidth
            value={newAgentPolicy.name}
            onChange={(e) => setNewAgentPolicy({ ...newAgentPolicy, name: e.target.value })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.fleet.copyAgentPolicy.confirmModal.newDescriptionLabel"
              defaultMessage="Description"
            />
          }
          fullWidth
        >
          <EuiFieldText
            fullWidth
            value={newAgentPolicy.description}
            onChange={(e) => setNewAgentPolicy({ ...newAgentPolicy, description: e.target.value })}
          />
        </EuiFormRow>
      </EuiConfirmModal>
    );
  };

  return (
    <Fragment>
      {children(copyAgentPolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
