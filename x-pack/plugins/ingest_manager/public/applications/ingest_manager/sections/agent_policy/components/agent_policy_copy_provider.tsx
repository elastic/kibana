/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentPolicy } from '../../../types';
import { sendCopyAgentPolicy, useCore } from '../../../hooks';

interface Props {
  children: (copyAgentPolicy: CopyAgentPolicy) => React.ReactElement;
}

export type CopyAgentPolicy = (agentPolicy: AgentPolicy, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (newAgentPolicy: AgentPolicy) => void;

export const AgentPolicyCopyProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useCore();
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
      throw new Error('No agent policy specified to copy');
    }
    setIsModalOpen(true);
    setAgentPolicy(agentPolicyToCopy);
    setNewAgentPolicy({
      name: i18n.translate(
        'xpack.ingestManager.copyAgentPolicy.confirmModal.defaultNewPolicyName',
        {
          defaultMessage: '{name} (copy)',
          values: { name: agentPolicyToCopy.name },
        }
      ),
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
      const { data } = await sendCopyAgentPolicy(agentPolicy!.id, newAgentPolicy!);

      if (data?.success) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.ingestManager.copyAgentPolicy.successNotificationTitle', {
            defaultMessage: 'Agent policy copied',
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(data.item);
        }
      }

      if (!data?.success) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.copyAgentPolicy.failureNotificationTitle', {
            defaultMessage: "Error copying agent policy '{id}'",
            values: { id: agentPolicy!.id },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.copyAgentPolicy.fatalErrorNotificationTitle', {
          defaultMessage: 'Error copying agent policy',
        })
      );
    }
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen || !agentPolicy || !newAgentPolicy) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <span className="eui-textBreakWord">
              <FormattedMessage
                id="xpack.ingestManager.copyAgentPolicy.confirmModal.copyPolicyTitle"
                defaultMessage="Copy '{name}' agent policy"
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
              id="xpack.ingestManager.copyAgentPolicy.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.ingestManager.copyAgentPolicy.confirmModal.confirmButtonLabel"
              defaultMessage="Copy policy"
            />
          }
          confirmButtonDisabled={isLoading || !newAgentPolicy.name.trim()}
        >
          <p>
            <FormattedMessage
              id="xpack.ingestManager.copyAgentPolicy.confirmModal.copyPolicyPrompt"
              defaultMessage="Choose a name and description for your new agent policy."
            />
          </p>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.copyAgentPolicy.confirmModal.newNameLabel"
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
                id="xpack.ingestManager.copyAgentPolicy.confirmModal.newDescriptionLabel"
                defaultMessage="Description"
              />
            }
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={newAgentPolicy.description}
              onChange={(e) =>
                setNewAgentPolicy({ ...newAgentPolicy, description: e.target.value })
              }
            />
          </EuiFormRow>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(copyAgentPolicyPrompt)}
      {renderModal()}
    </Fragment>
  );
};
