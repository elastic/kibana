/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  SAVE_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
  DELETE_BUTTON_LABEL,
} from '../../../../../../shared/constants';
import { CrawlerAuth } from '../../../../../api/crawler/types';
import { CrawlerDomainDetailLogic } from '../crawler_domain_detail_logic';

import { AuthenticationPanelLogic } from './authentication_panel_logic';

export const AuthenticationPanelActions: React.FC = () => {
  const { domain } = useValues(CrawlerDomainDetailLogic);

  const currentAuth: CrawlerAuth = domain?.auth ?? null;

  const { disableEditing, enableEditing, saveCredentials, setIsModalVisible } =
    useActions(AuthenticationPanelLogic);

  const { isEditing } = useValues(AuthenticationPanelLogic);

  return isEditing ? (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiButtonEmpty
          data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-save"
          iconType="checkInCircleFilled"
          size="s"
          color="primary"
          onClick={() => saveCredentials()}
        >
          {SAVE_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-cancel"
          iconType="crossInACircleFilled"
          size="s"
          color="danger"
          onClick={() => disableEditing()}
        >
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : currentAuth === null ? (
    <EuiButton
      data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-addCredentials"
      color="success"
      iconType="plusInCircle"
      size="s"
      onClick={() => enableEditing(currentAuth)}
    >
      {i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.resetToDefaultsButtonLabel',
        {
          defaultMessage: 'Add credentials',
        }
      )}
    </EuiButton>
  ) : (
    <EuiButtonEmpty
      data-telemetry-id="entSearchContent-crawler-domainDetail-authentication-deleteCredentials"
      color="primary"
      size="s"
      onClick={() => {
        setIsModalVisible(true);
      }}
    >
      {DELETE_BUTTON_LABEL}
    </EuiButtonEmpty>
  );
};
