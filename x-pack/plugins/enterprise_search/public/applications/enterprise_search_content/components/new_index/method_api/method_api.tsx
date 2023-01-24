/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CREATE_ELASTICSEARCH_INDEX_STEP, BUILD_SEARCH_EXPERIENCE_STEP } from '../method_steps';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { MethodApiLogic } from './method_api_logic';

export const MethodApi: React.FC = () => {
  const { makeRequest } = useActions(MethodApiLogic);
  return (
    <NewSearchIndexTemplate
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.content.newIndex.methodApi.title"
          defaultMessage="Index using the API"
        />
      }
      type="api"
      onSubmit={(indexName, language) => makeRequest({ indexName, language })}
    >
      <EuiSteps
        steps={[
          CREATE_ELASTICSEARCH_INDEX_STEP,
          {
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
