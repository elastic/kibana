/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiText,
  EuiFlexGroup,
  EuiButton,
  EuiButtonIcon,
  EuiFlexItem,
  EuiSteps,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { GenerateConnectorApiKeyApiLogic } from '../../api/connector_package/generate_connector_api_key_api_logic';
import { ApiKey } from '../api_key/api_key';

export const ConfigurationConnector: React.FC<{ indexId: string; indexName: string }> = ({
  indexId,
  indexName,
}) => {
  const { makeRequest, apiReset } = useActions(GenerateConnectorApiKeyApiLogic);
  const { data: apiKeyData } = useValues(GenerateConnectorApiKeyApiLogic);

  useEffect(() => {
    apiReset();
    return apiReset;
  }, [indexName]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.configuration.title',
                  {
                    defaultMessage: 'Configuration',
                  }
                )}
              </h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem>
                <EuiButtonIcon iconType="iInCircle" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={() => makeRequest({ indexName })}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.indices.configurationConnector.generateApiKey.label',
                    {
                      defaultMessage: 'Generate an API key',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column">
          {apiKeyData && (
            <EuiFlexItem>
              <ApiKey apiKey={apiKeyData?.encoded} label="API Key" />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <ApiKey apiKey={indexId} label="Index ID" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSteps
          steps={[
            {
              children: (
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.steps.generateApiKey.content',
                      {
                        defaultMessage:
                          'Generate an API key. Keep it somewhere safe while you configure your connector. If you need to regenerate an API key, previous API keys will be invalidated.',
                      }
                    )}
                  </p>
                </EuiText>
              ),
              status: 'incomplete',
              title: i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.steps.generateApiKey.title',
                {
                  defaultMessage: 'Generate an API key',
                }
              ),

              titleSize: 'xs',
            },
            {
              children: (
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.steps.deployConnector.content',
                      {
                        defaultMessage:
                          'Deploy your connector on your own infrastructure, and configure it with your API key and unique ID listed above.',
                      }
                    )}
                  </p>
                </EuiText>
              ),
              status: 'incomplete',
              title: i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.steps.deployConnector.title',
                {
                  defaultMessage: 'Deploy your connector',
                }
              ),
              titleSize: 'xs',
            },
            {
              children: (
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.steps.configureConnector.content',
                      {
                        defaultMessage:
                          'Configure your newly deployed connector with the necessary configuration details so it can connect to your data source.',
                      }
                    )}
                  </p>
                </EuiText>
              ),
              status: 'incomplete',
              title: i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.steps.configureConnector.title',
                {
                  defaultMessage: 'Build a search experience',
                }
              ),
              titleSize: 'xs',
            },
            {
              children: (
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.configurationConnector.steps.buildSearchExperience.content',
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
                'xpack.enterpriseSearch.content.indices.configurationConnector.steps.buildSearchExperience.title',
                {
                  defaultMessage: 'Build a search experience',
                }
              ),
              titleSize: 'xs',
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
