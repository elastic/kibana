/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../shared/constants';
import { CrawlerAuth } from '../../../api/crawler/types';
import { CrawlerDomainDetailLogic } from '../crawler_domain_detail_logic';

import { AuthenticationPanelLogic } from './authentication_panel_logic';
import { AUTHENTICATION_LABELS } from './constants';

export const AuthenticationPanelDeleteConfirmationModal: React.FC = () => {
  const { domain } = useValues(CrawlerDomainDetailLogic);

  const currentAuth: CrawlerAuth = domain?.auth ?? null;

  const { deleteCredentials, setIsModalVisible } = useActions(AuthenticationPanelLogic);

  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.title',
        {
          defaultMessage: 'Are you sure you want to delete {authType} credentials?',
          values: {
            authType: currentAuth ? AUTHENTICATION_LABELS[currentAuth?.type] : '',
          },
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
          defaultMessage: 'Delete credentials',
        }
      )}
      defaultFocusedButton="confirm"
      buttonColor="danger"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.deleteConfirmationModal.description',
        {
          defaultMessage:
            'Deleting these credentials might prevent the crawler from indexing protected areas of the domain. This can not be undone.',
        }
      )}
    </EuiConfirmModal>
  );
};
