/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over Connector views from App Search to the panel below.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiSteps, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';
import { AddConnectorPackageApiLogic } from '../../api/connector_package/add_connector_package_api_logic';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodConnector: React.FC = () => {
  const { makeRequest } = useActions(AddConnectorPackageApiLogic);
  const { status } = useValues(AddConnectorPackageApiLogic);
  return (
    <NewSearchIndexTemplate
      title="Build a custom connector package"
      description={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodConnector.description',
        {
          defaultMessage:
            'Ingest data from content sources like GitHub, Google Drive or SharePoint You can also build your own connectors using Custom API sources.',
        }
      )}
      docsUrl="#"
      type="connector"
      onSubmit={(name) => makeRequest({ indexName: name })}
      formDisabled={status === Status.LOADING}
      buttonLoading={status === Status.LOADING}
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
                    'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'Clone the connector package repository on GitHub and build a custom connector that suits your needs.',
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
