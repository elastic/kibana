/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiEmptyPrompt, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CrawlerAuth } from '../../../api/crawler/types';
import { CrawlerDomainDetailLogic } from '../crawler_domain_detail_logic';

import './authentication_panel.scss';

export const AuthenticationPanelViewContent: React.FC = () => {
  const { domain } = useValues(CrawlerDomainDetailLogic);

  const currentAuth: CrawlerAuth = domain?.auth ?? null;

  return currentAuth === undefined ? (
    <EuiEmptyPrompt
      title={
        <h4>
          {i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.title', {
            defaultMessage: 'No authentication configured',
          })}
        </h4>
      }
      body={
        <FormattedMessage
          id="xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.description"
          defaultMessage="Click {addAuthenticationButtonLabel} to provide the credentials needed to crawl protected content"
          values={{
            addAuthenticationButtonLabel: (
              <strong>
                {i18n.translate(
                  'xpack.enterpriseSearch.crawler.authenticationPanel.emptyPrompt.addAuthenticationButtonLabel',
                  {
                    defaultMessage: 'Add authentication',
                  }
                )}
              </strong>
            ),
          }}
        />
      }
      titleSize="s"
    />
  ) : (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <EuiTitle size="s">
        <h3>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.authenticationPanel.configurationSavePanel.title',
            {
              defaultMessage: 'Configuration settings saved',
            }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiText size="s">
        {i18n.translate(
          'xpack.enterpriseSearch.crawler.authenticationPanel.configurationSavePanel.description',
          {
            defaultMessage:
              'Authentication settings for crawling protected content have been saved. To update an authentication mechanism, delete settings and restart.',
          }
        )}
      </EuiText>
    </EuiPanel>
  );
};
