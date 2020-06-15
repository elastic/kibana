/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../types';
import { sendCopyAgentConfig, useCore } from '../../../hooks';

interface Props {
  children: (copyAgentConfig: CopyAgentConfig) => React.ReactElement;
}

export type CopyAgentConfig = (agentConfig: AgentConfig, onSuccess?: OnSuccessCallback) => void;

type OnSuccessCallback = (newAgentConfig: AgentConfig) => void;

export const AgentConfigCopyProvider: React.FunctionComponent<Props> = ({ children }) => {
  const { notifications } = useCore();
  const [agentConfig, setAgentConfig] = useState<AgentConfig>();
  const [newAgentConfig, setNewAgentConfig] = useState<Pick<AgentConfig, 'name' | 'description'>>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const onSuccessCallback = useRef<OnSuccessCallback | null>(null);

  const copyAgentConfigPrompt: CopyAgentConfig = (
    agentConfigToCopy,
    onSuccess = () => undefined
  ) => {
    if (!agentConfigToCopy) {
      throw new Error('No agent config specified to copy');
    }
    setIsModalOpen(true);
    setAgentConfig(agentConfigToCopy);
    setNewAgentConfig({
      name: i18n.translate(
        'xpack.ingestManager.copyAgentConfig.confirmModal.defaultNewConfigName',
        {
          defaultMessage: '{name} (copy)',
          values: { name: agentConfigToCopy.name },
        }
      ),
      description: agentConfigToCopy.description,
    });
    onSuccessCallback.current = onSuccess;
  };

  const closeModal = () => {
    setAgentConfig(undefined);
    setNewAgentConfig(undefined);
    setIsLoading(false);
    setIsModalOpen(false);
  };

  const copyAgentConfig = async () => {
    setIsLoading(true);
    try {
      const { data } = await sendCopyAgentConfig(agentConfig!.id, newAgentConfig!);

      if (data?.success) {
        notifications.toasts.addSuccess(
          i18n.translate('xpack.ingestManager.copyAgentConfig.successNotificationTitle', {
            defaultMessage: 'Agent config copied',
          })
        );
        if (onSuccessCallback.current) {
          onSuccessCallback.current(data.item);
        }
      }

      if (!data?.success) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.copyAgentConfig.failureNotificationTitle', {
            defaultMessage: "Error copying agent config '{id}'",
            values: { id: agentConfig!.id },
          })
        );
      }
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.ingestManager.copyAgentConfig.fatalErrorNotificationTitle', {
          defaultMessage: 'Error copying agent config',
        })
      );
    }
    closeModal();
  };

  const renderModal = () => {
    if (!isModalOpen || !agentConfig || !newAgentConfig) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.ingestManager.copyAgentConfig.confirmModal.copyConfigTitle"
              defaultMessage="Copy '{name}' agent configuration"
              values={{
                name: agentConfig.name,
              }}
            />
          }
          onCancel={closeModal}
          onConfirm={copyAgentConfig}
          cancelButtonText={
            <FormattedMessage
              id="xpack.ingestManager.copyAgentConfig.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.ingestManager.copyAgentConfig.confirmModal.confirmButtonLabel"
              defaultMessage="Copy configuration"
            />
          }
          confirmButtonDisabled={isLoading || !newAgentConfig.name.trim()}
        >
          <p>
            <FormattedMessage
              id="xpack.ingestManager.copyAgentConfig.confirmModal.copyConfigPrompt"
              defaultMessage="Choose a name and description for your new agent configuration."
            />
          </p>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.copyAgentConfig.confirmModal.newNameLabel"
                defaultMessage="New configuration name"
              />
            }
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={newAgentConfig.name}
              onChange={(e) => setNewAgentConfig({ ...newAgentConfig, name: e.target.value })}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.copyAgentConfig.confirmModal.newDescriptionLabel"
                defaultMessage="Description"
              />
            }
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={newAgentConfig.description}
              onChange={(e) =>
                setNewAgentConfig({ ...newAgentConfig, description: e.target.value })
              }
            />
          </EuiFormRow>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  };

  return (
    <Fragment>
      {children(copyAgentConfigPrompt)}
      {renderModal()}
    </Fragment>
  );
};
