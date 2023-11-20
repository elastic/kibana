/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React from 'react';
import { useCreateConnector } from '../hooks/api/use_create_connector';

export const ConnectorIngestionPanel = () => {
  const { createConnector } = useCreateConnector();
  return (
    <EuiFlexGroup direction="column" justifyContent="spaceEvenly" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h6>
            {i18n.translate(
              'xpack.serverlessSearch.ingestData.alternativeOptions.connectorsTitle',
              {
                defaultMessage: 'Connectors',
              }
            )}
          </h6>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText>
          <p>
            {i18n.translate(
              'xpack.serverlessSearch.ingestData.alternativeOptions.connectorsDescription',
              {
                defaultMessage:
                  'Sync third-party data sources to Elasticsearch, by deploying open code Elastic connectors on your own infrastructure.  ',
              }
            )}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexGroup direction="row" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={() => createConnector()}>
            {i18n.translate(
              'xpack.serverlessSearch.ingestData.alternativeOptions.setupConnectorLabel',
              {
                defaultMessage: 'Set up a connector',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href="https://github.com/elastic/connectors-python">
            <EuiButtonEmpty color="primary" iconType="logoGithub" size="s">
              {i18n.translate(
                'xpack.serverlessSearch.ingestData.alternativeOptions.connectorPythonGithubLabel',
                {
                  defaultMessage: 'connectors-python',
                }
              )}
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href="https://github.com/elastic/connectors-python/blob/main/docs/DOCKER.md">
            <EuiButtonEmpty color="primary" iconType="logoDocker" size="s">
              {i18n.translate(
                'xpack.serverlessSearch.ingestData.alternativeOptions.connectorDockerLabel',
                {
                  defaultMessage: 'Docker',
                }
              )}
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
    </EuiFlexGroup>
  );
};
