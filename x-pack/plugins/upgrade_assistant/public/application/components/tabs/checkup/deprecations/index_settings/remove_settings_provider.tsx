/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiConfirmModal } from '@elastic/eui';
// import { HttpSetup } from 'src/core/public';

interface Props {
  children: (removeIndexSettings: any) => React.ReactNode;
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
  modalTitle: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.title',
    {
      defaultMessage: 'Remove deprecated index settings?',
    }
  ),
  modalDescription: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.confirmationModal.description',
    {
      defaultMessage: 'The following deprecated index settings were detected and will be deleted:',
    }
  ),
};

export const RemoveIndexSettingsProvider = ({ children }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [deprecatedSettings, setDeprecatedSettings] = useState<string[]>([]);

  const removeIndexSettings = () => {
    // try {
    //   await this.props.http.post(
    //     `/api/upgrade_assistant/add_query_default_field/${this.props.indexName}`,
    //     {
    //       body: JSON.stringify({
    //         fieldTypes: [...BEAT_DEFAULT_FIELD_TYPES],
    //         otherFields: [...BEAT_OTHER_DEFAULT_FIELDS],
    //       }),
    //     }
    //   );

    //   this.setState({
    //     fixLoadingState: LoadingState.Success,
    //   });
    // } catch (e) {
    //   this.setState({
    //     fixLoadingState: LoadingState.Error,
    //   });
    // }

    setIsModalOpen(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    closeModal();
  };

  const removeSettingsPrompt = (settings: string[]) => {
    setIsModalOpen(true);
    setDeprecatedSettings(settings);
  };

  return (
    <>
      {children(removeSettingsPrompt)}

      {isModalOpen && (
        <EuiConfirmModal
          title={i18nTexts.modalTitle}
          data-test-subj="indexSettingsDeleteConfirmModal"
          onCancel={closeModal}
          onConfirm={confirmDelete}
          cancelButtonText={i18nTexts.cancelButtonLabel}
          buttonColor="danger"
          confirmButtonText={i18nTexts.removeButtonLabel}
        >
          <>
            <p>{i18nTexts.modalDescription}</p>
            <ul>
              {deprecatedSettings.map((setting, index) => (
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
