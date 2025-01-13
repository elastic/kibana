/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';
import { GithubIcon } from '../../../shared/icons/github_icon';
import { KibanaLogic } from '../../../shared/kibana';
import { NEW_CRAWLER_PATH } from '../../routes';

export const CrawlerEmptyState: React.FC = () => {
  const { errorConnectingMessage } = useValues(HttpLogic);
  return (
    <EuiPanel hasBorder>
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.crawlerEmptyState.h2.createYourFirstWebLabel', {
              defaultMessage: 'Create your first web crawler',
            })}
          </h2>
        }
        titleSize="m"
        body={
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.crawlerEmptyState.p.discoverExtractAndIndexLabel',
              {
                defaultMessage:
                  'Discover extract and index searchable content from websites and knowledge bases',
              }
            )}
          </p>
        }
        actions={
          Boolean(errorConnectingMessage) ? (
            <EuiButton
              data-test-subj="entSearchContent-crawlers-emptyState-createCrawlerButton"
              data-telemetry-id="entSearchContent-crawlers-emptyState-createCrawlerButton"
              color="primary"
              fill
              iconType={GithubIcon}
              href={'https://github.com/elastic/crawler'}
              target="_blank"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.crawlerEmptyState.openSourceCrawlerButtonLabel',
                {
                  defaultMessage: 'Source code',
                }
              )}
            </EuiButton>
          ) : (
            <EuiButton
              data-test-subj="entSearchContent-crawlers-emptyState-createCrawlerButton"
              data-telemetry-id="entSearchContent-crawlers-emptyState-createCrawlerButton"
              color="primary"
              fill
              iconType="plusInCircle"
              onClick={() => KibanaLogic.values.navigateToUrl(NEW_CRAWLER_PATH)}
            >
              {i18n.translate('xpack.enterpriseSearch.crawlerEmptyState.newWebCrawlerButtonLabel', {
                defaultMessage: 'New web crawler',
              })}
            </EuiButton>
          )
        }
      />
    </EuiPanel>
  );
};
