/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiLink,
  EuiPageHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAppSearchUrl } from '../../../shared/enterprise_search_url';
import { DOCS_PREFIX, ENGINE_CRAWLER_PATH } from '../../routes';
import { generateEnginePath } from '../engine';

import './crawler_landing.scss';
import { CRAWLER_TITLE } from '.';

export const CrawlerLanding: React.FC = () => (
  <div data-test-subj="CrawlerLanding" className="crawlerLanding">
    <EuiPageHeader pageTitle={CRAWLER_TITLE} />
    <EuiSpacer />
    <EuiPanel grow paddingSize="l" className="crawlerLanding__panel">
      <div className="crawlerLanding__wrapper">
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.crawler.landingPage.title', {
              defaultMessage: 'Setup the Web Crawler',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.crawler.landingPage.description',
              {
                defaultMessage:
                  "Easily index your website's content. To get started, enter your domain name, provide optional entry points and crawl rules, and we will handle the rest.",
              }
            )}{' '}
            <EuiLink
              target="_blank"
              href={`${DOCS_PREFIX}/web-crawler.html`}
              data-test-subj="CrawlerDocumentationLink"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.crawler.landingPage.documentationLinkLabel',
                {
                  defaultMessage: 'Learn more about the web crawler.',
                }
              )}
            </EuiLink>
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton
          iconType="popout"
          fill
          color="primary"
          href={getAppSearchUrl(generateEnginePath(ENGINE_CRAWLER_PATH))}
          target="_blank"
          data-test-subj="CrawlerStandaloneLink"
        >
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.crawler.landingPage.standaloneLinkLabel',
            {
              defaultMessage: 'Configure the web crawler',
            }
          )}
        </EuiButton>
        <EuiSpacer size="xl" />
      </div>
    </EuiPanel>
  </div>
);
