/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiEmptyPrompt, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { USERNAME_LABEL, PASSWORD_LABEL, TYPE_LABEL } from '../../../../shared/constants';
import { CrawlerAuth, BasicCrawlerAuth, RawCrawlerAuth } from '../../../api/crawler/types';
import { isBasicCrawlerAuth, isRawCrawlerAuth } from '../../../api/crawler/utils';
import { CrawlerDomainDetailLogic } from '../crawler_domain_detail_logic';

import { AuthenticationPanelLogic } from './authentication_panel_logic';
import { AUTHENTICATION_LABELS } from './constants';

import './authentication_panel.scss';

const TOGGLE_VISIBILITY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.crawler.authenticationPanel.toggleVisibilityLabel',
  { defaultMessage: 'Toggle credential visibility' }
);

export const AuthenticationPanelViewContent: React.FC = () => {
  const { domain } = useValues(CrawlerDomainDetailLogic);

  const currentAuth: CrawlerAuth = domain?.auth ?? null;

  const { toggleCredentialVisibility } = useActions(AuthenticationPanelLogic);

  const { areCredentialsVisible } = useValues(AuthenticationPanelLogic);

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
    <>
      {currentAuth !== undefined && isBasicCrawlerAuth(currentAuth) && (
        <EuiBasicTable
          items={[currentAuth]}
          columns={[
            {
              name: TYPE_LABEL,
              render: () => AUTHENTICATION_LABELS.basic,
            },
            {
              name: USERNAME_LABEL,
              field: 'username',
            },
            {
              name: PASSWORD_LABEL,
              render: (item: BasicCrawlerAuth) =>
                areCredentialsVisible
                  ? item.password
                  : item.password
                      .split('')
                      .map(() => '•')
                      .join(''),
            },
            {
              actions: [
                {
                  name: '',
                  description: TOGGLE_VISIBILITY_LABEL,
                  type: 'icon',
                  icon: 'eye',
                  color: 'primary',
                  onClick: () => {
                    toggleCredentialVisibility();
                  },
                },
              ],
            },
          ]}
        />
      )}
      {currentAuth !== undefined && isRawCrawlerAuth(currentAuth) && (
        <EuiBasicTable
          items={[currentAuth]}
          columns={[
            {
              name: i18n.translate('xpack.enterpriseSearch.crawler.authenticationPanel.typeLabel', {
                defaultMessage: 'Type',
              }),
              render: () => AUTHENTICATION_LABELS.raw,
            },
            {
              name: PASSWORD_LABEL,
              render: (item: RawCrawlerAuth) =>
                areCredentialsVisible
                  ? item.header
                  : item.header
                      .split('')
                      .map(() => '•')
                      .join(''),
            },
            {
              actions: [
                {
                  name: '',
                  description: TOGGLE_VISIBILITY_LABEL,
                  type: 'icon',
                  icon: 'eye',
                  color: 'primary',
                  onClick: () => {
                    toggleCredentialVisibility();
                  },
                },
              ],
            },
          ]}
        />
      )}
    </>
  );
};
