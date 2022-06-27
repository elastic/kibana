/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 */

import React from 'react';

import { EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodApi: React.FC = () => {
  return (
    <NewSearchIndexTemplate
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.content.newIndex.methodApi.title"
          defaultMessage="Index using the API"
        />
      }
      description={
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.content.newIndex.methodApi.description"
            defaultMessage="Provide a name and optionally select a language analyzer for your documents. An Elasticsearch index will be created. In the next step, well display API instructions."
          />
        </EuiText>
      }
      docsUrl="#"
      type="api"
      onSubmit={() => null}
    >
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.createIndex.title',
              {
                defaultMessage: 'Create an Elasticsearch index',
              }
            ),

            titleSize: 'xs',
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.steps.createIndex.content',
                    {
                      defaultMessage:
                        'Provide a unique name for your index and select an optional language analyzer.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
          },
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.configureIngestion.title',
              {
                defaultMessage: 'Configure ingestion settings',
              }
            ),
            titleSize: 'xs',
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.methodApi.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'Generate an API key and view the documentation for posting documents to the Elasticsearch API endpoint. Language clients are available for streamlined integration.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
          },
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.steps.buildSearchExperience.title',
              {
                defaultMessage: 'Build a search experience',
              }
            ),
            titleSize: 'xs',
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
          },
        ]}
      />
    </NewSearchIndexTemplate>
  );
};
