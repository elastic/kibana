/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over existing Crawler view from App Search to the panel below.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { CreateCrawlerIndexApiLogic } from '../../../api/crawler/create_crawler_index_api_logic';
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
      formDisabled={status === Status.LOADING}
      buttonLoading={status === Status.LOADING}
    >
      <EuiSteps
        steps={[
          {
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.steps.createIndex.content',
                    {
                      defaultMessage:
                        'Provide a unique name for your index and select an optional index language.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.createIndex.title',
              {
                defaultMessage: 'Create an Elasticsearch index',
              }
            ),

            titleSize: 'xs',
          },
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
          {
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.content',
                    {
                      defaultMessage:
                        'Connect your newly created Elasticsearch index to an App Search engine to build a cusomtizable search experience.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.title',
              {
                defaultMessage: 'Build a search experience',
              }
            ),
            titleSize: 'xs',
          },
        ]}
      />
    </NewSearchIndexTemplate>
  );
};
