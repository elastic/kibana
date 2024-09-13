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
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GithubLink } from '@kbn/search-api-panels';

import React from 'react';
import { useCreateConnector } from '../hooks/api/use_create_connector';

export const ConnectorIngestionPanel: React.FC<{ assetBasePath: string }> = ({ assetBasePath }) => {
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
          <EuiLink
            data-test-subj="serverlessSearchConnectorIngestionPanelSetUpAConnectorLink"
            onClick={() => createConnector()}
          >
            {i18n.translate(
              'xpack.serverlessSearch.ingestData.alternativeOptions.setupConnectorLabel',
              {
                defaultMessage: 'Set up a connector',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GithubLink
            href="https://github.com/elastic/connectors"
            label="connectors"
            assetBasePath={assetBasePath}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon size="s" type="logoDocker" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiLink
                  data-test-subj="serverlessSearchConnectorIngestionPanelDockerLink"
                  target="_blank"
                  href="https://github.com/elastic/connectors-python/blob/main/docs/DOCKER.md"
                >
                  {i18n.translate(
                    'xpack.serverlessSearch.ingestData.alternativeOptions.connectorDockerLabel',
                    {
                      defaultMessage: 'Docker',
                    }
                  )}
                </EuiLink>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
};
