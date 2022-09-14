/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiEmptyPrompt, EuiPanel, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlerAuth } from '../../../api/crawler/types';
import { isBasicCrawlerAuth, isRawCrawlerAuth } from '../../../api/crawler/utils';
import { CrawlerDomainDetailLogic } from '../crawler_domain_detail_logic';

import { AUTHENTICATION_LABELS } from './constants';

import './authentication_panel.scss';

export const AuthenticationPanelViewContent: React.FC = () => {
  const { domain } = useValues(CrawlerDomainDetailLogic);

  const currentAuth: CrawlerAuth = domain?.auth ?? null;

  return currentAuth === undefined ? (
    <EuiEmptyPrompt
      title={
        <h4>
          {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.title', {
            defaultMessage: 'There are no credentials for this domain',
          })}
        </h4>
      }
      body={i18n.translate(
        'xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.description',
        {
          defaultMessage: 'Add credentials to requests originating from crawlers',
        }
      )}
      titleSize="s"
    />
  ) : (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <EuiTitle size="s">
        <span>
          {isBasicCrawlerAuth(currentAuth)
            ? AUTHENTICATION_LABELS.basic
            : isRawCrawlerAuth(currentAuth)
            ? AUTHENTICATION_LABELS.raw
            : AUTHENTICATION_LABELS.generic}
          saved
        </span>
      </EuiTitle>
      <EuiSpacer />
      <EuiText size="s">
        {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.cannotModifyMessage', {
          defaultMessage: ' Credentials cannot be modified once saved, and must be deleted',
        })}
      </EuiText>
    </EuiPanel>
  );
};
