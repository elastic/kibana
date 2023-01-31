/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AuthenticationPanelActions } from './authentication_panel_actions';
import { AuthenticationPanelDeleteConfirmationModal } from './authentication_panel_delete_confirmation_modal';
import { AuthenticationPanelEditContent } from './authentication_panel_edit_content';
import { AuthenticationPanelLogic } from './authentication_panel_logic';
import { AuthenticationPanelViewContent } from './authentication_panel_view_content';

import './authentication_panel.scss';

export const AuthenticationPanel: React.FC = () => {
  const { isEditing, isModalVisible } = useValues(AuthenticationPanelLogic);

  return (
    <>
      <div className="authenticationPanel">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.title', {
                  defaultMessage: 'Authentication',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AuthenticationPanelActions />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.enterpriseSearch.crawler.authenticationPanel.description"
              defaultMessage="Setup authentication to enable crawling protected content for this domain."
            />
          </p>
        </EuiText>
        {isEditing ? <AuthenticationPanelEditContent /> : <AuthenticationPanelViewContent />}
      </div>
      {isModalVisible && <AuthenticationPanelDeleteConfirmationModal />}
    </>
  );
};
