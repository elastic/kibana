/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiSteps, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { docLinks } from '../../../../shared/doc_links';
import { CreateCrawlerIndexApiLogic } from '../../../api/crawler/create_crawler_index_api_logic';
import { CREATE_ELASTICSEARCH_INDEX_STEP, BUILD_SEARCH_EXPERIENCE_STEP } from '../method_steps';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { MethodCrawlerLogic } from './method_crawler_logic';

export const MethodCrawler: React.FC = () => {
  const { status } = useValues(CreateCrawlerIndexApiLogic);
  const { makeRequest } = useActions(CreateCrawlerIndexApiLogic);

  MethodCrawlerLogic.mount();

  return (
    <NewSearchIndexTemplate
      title={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.steps.createIndex.crawler.title',
        {
          defaultMessage: 'Index using the web crawler',
        }
      )}
      type="crawler"
      onSubmit={(indexName, language) => makeRequest({ indexName, language })}
      buttonLoading={status === Status.LOADING}
      docsUrl={docLinks.crawlerOverview}
    >
      <EuiSteps
        steps={[
          CREATE_ELASTICSEARCH_INDEX_STEP,
          {
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodCrawler.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'Configure the domains you’d like to crawl, and when ready trigger your first crawl. Let Enterprise Search do the rest.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.configureIngestion.title',
              {
                defaultMessage: 'Configure ingestion settings',
              }
            ),
            titleSize: 'xs',
          },
          BUILD_SEARCH_EXPERIENCE_STEP,
        ]}
      />
    </NewSearchIndexTemplate>
  );
};
