/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiConfirmModal } from '@elastic/eui';
import { useAppContext } from '../../../../app_context';

interface Props {
  children: (
    removeSettingsPrompt: (index: string, settings: string[]) => void,
    successfulRequests: { [key: string]: boolean }
  ) => React.ReactNode;
}

const i18nTexts = {
  removeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.confirmationModal.removeButtonLabel',
    {
      defaultMessage: 'Remove',
    }
  ),
  cancelButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  modalDescription: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.description',
    {
      defaultMessage: 'The following deprecated index settings were detected and will be removed:',
    }
  ),
  successNotificationText: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.successNotificationText',
    {
      defaultMessage: 'Index settings removed',
    }
  ),
  errorNotificationText: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.errorNotificationText',
    {
      defaultMessage: 'Error removing index settings',
    }
  ),
};

export const RemoveIndexSettingsProvider = ({ children }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [successfulRequests, setSuccessfulRequests] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const deprecatedSettings = useRef<string[]>([]);
  const indexName = useRef<string | undefined>(undefined);

  const { api, notifications } = useAppContext();

  const removeIndexSettings = async () => {
    setIsLoading(true);

    const { error } = await api.updateIndexSettings(indexName.current!, deprecatedSettings.current);

    setIsLoading(false);
    closeModal();

    if (error) {
      notifications.toasts.addDanger(i18nTexts.errorNotificationText);
    } else {
      setSuccessfulRequests({
        [indexName.current!]: true,
      });
      notifications.toasts.addSuccess(i18nTexts.successNotificationText);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const removeSettingsPrompt = (index: string, settings: string[]) => {
    setIsModalOpen(true);
    setSuccessfulRequests({
      [index]: false,
    });
    indexName.current = index;
    deprecatedSettings.current = settings;
  };

  return (
    <>
      {children(removeSettingsPrompt, successfulRequests)}

      {isModalOpen && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.title',
            {
              defaultMessage: `Remove deprecated settings from '{indexName}'?`,
              values: {
                indexName: indexName.current,
              },
            }
          )}
          data-test-subj="indexSettingsDeleteConfirmModal"
          onCancel={closeModal}
          onConfirm={removeIndexSettings}
          cancelButtonText={i18nTexts.cancelButtonLabel}
          buttonColor="danger"
          confirmButtonText={i18nTexts.removeButtonLabel}
          isLoading={isLoading}
        >
          <>
            <p>{i18nTexts.modalDescription}</p>
            <ul>
              {deprecatedSettings.current.map((setting, index) => (
                <li key={`${setting}-${index}`}>
                  <EuiCode>{setting}</EuiCode>
                </li>
              ))}
            </ul>
          </>
        </EuiConfirmModal>
      )}
    </>
  );
};
