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

import { AddConnectorPackageLogic } from '../../api/connector_package/add_connector_package_logic';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodConnector: React.FC = () => {
  const { makeRequest } = useActions(AddConnectorPackageApiLogic);
  const { status } = useValues(AddConnectorPackageApiLogic);
  AddConnectorPackageLogic.mount();
  return (
    <NewSearchIndexTemplate
      title="Build a connector"
      type="connector"
      onSubmit={(name) => makeRequest({ indexName: name })}
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
                    'xpack.enterpriseSearch.content.newIndex.methodConnector.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'TODO TODO TODO Clone the connector package repository on GitHub and build a custom connector that suits your needs.',
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
