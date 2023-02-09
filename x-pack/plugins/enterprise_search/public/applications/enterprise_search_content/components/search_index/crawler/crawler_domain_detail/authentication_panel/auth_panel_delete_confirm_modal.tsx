/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../../shared/constants';

import { AuthenticationPanelLogic } from './authentication_panel_logic';

export const AuthenticationPanelDeleteConfirmationModal: React.FC = () => {
  const { deleteCredentials, setIsModalVisible } = useActions(AuthenticationPanelLogic);

  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.title',
        {
          defaultMessage: 'Are you sure you want to delete these settings?',
        }
      )}
      onCancel={(event) => {
        event?.preventDefault();
        setIsModalVisible(false);
      }}
      onConfirm={(event) => {
        event.preventDefault();
        deleteCredentials();
      }}
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.deleteButtonLabel',
        {
          defaultMessage: 'Delete',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.description',
        {
          defaultMessage:
            'Deleting these settings might prevent the crawler from indexing protected areas of the domain. This can not be undone.',
        }
      )}
    </EuiConfirmModal>
  );
};
