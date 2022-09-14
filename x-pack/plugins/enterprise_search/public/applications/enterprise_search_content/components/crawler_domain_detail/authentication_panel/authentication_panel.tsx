/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DataPanel } from '../../../../shared/data_panel/data_panel';

import { AuthenticationPanelActions } from './authentication_panel_actions';
import { AuthenticationPanelDeleteConfirmationModal } from './authentication_panel_delete_confirmation_modal';
import { AuthenticationPanelLogic } from './authentication_panel_logic';
import { AuthenticationPanelViewContent } from './authentication_panel_view_content';

import './authentication_panel.scss';

export const AuthenticationPanel: React.FC = () => {
  const { isModalVisible } = useValues(AuthenticationPanelLogic);

  return (
    <>
      <DataPanel
        className="authenticationPanel"
        hasBorder
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.title', {
              defaultMessage: 'Authentiction',
            })}
          </h2>
        }
        action={<AuthenticationPanelActions />}
        subtitle={
          <FormattedMessage
            id="xpack.enterpriseSearch.crawler.authenticationPanel.description"
            defaultMessage="Credentials are used when requests originate from crawlers."
          />
        }
      >
        <AuthenticationPanelViewContent />
      </DataPanel>
      {isModalVisible && <AuthenticationPanelDeleteConfirmationModal />}
    </>
  );
};
