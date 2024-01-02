/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';
import { ConnectorStatus } from '@kbn/search-connectors';
import React from 'react';
import { docLinks } from '../../../../../common/doc_links';
import { useAssetBasePath } from '../../../hooks/use_asset_base_path';
import { useKibanaServices } from '../../../hooks/use_kibana';

interface ConnectorLinkElasticsearchProps {
  connectorId: string;
  serviceType: string;
  status: ConnectorStatus;
}

export const ConnectorLinkElasticsearch: React.FC<ConnectorLinkElasticsearchProps> = ({
  connectorId,
  serviceType,
  status,
}) => {
  const assetBasePath = useAssetBasePath();
  const { cloud } = useKibanaServices();

  const elasticsearchUrl = cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER;

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.serverlessSearch.connectors.config.link.linkToElasticTitle', {
              defaultMessage: 'Link your connector to Elasticsearch',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          {i18n.translate('xpack.serverlessSearch.connectors.config.linkToElasticDescription', {
            defaultMessage:
              'You need to run the connector code on your own infrastructure and link it to your Elasticsearch instance. You have two options:',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <span>
              <EuiButton
                data-test-subj="serverlessSearchConnectorLinkElasticsearchRunWithDockerButton"
                iconType={`${assetBasePath}/docker.svg`}
                href={docLinks.connectors}
                fill
              >
                {i18n.translate('xpack.serverlessSearch.connectors.runWithDockerLink', {
                  defaultMessage: 'Run with Docker',
                })}
              </EuiButton>
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span>
              <EuiButton
                data-test-subj="serverlessSearchConnectorLinkElasticsearchRunFromSourceButton"
                iconType={`${assetBasePath}/github_white.svg`}
                href="https://github.com/elastic/connectors"
                fill
              >
                {i18n.translate('xpack.serverlessSearch.connectors.runFromSourceLink', {
                  defaultMessage: 'Run from source',
                })}
              </EuiButton>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexItem>
          <EuiPanel hasBorder>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.serverlessSearch.connectors.variablesTitle"
                  defaultMessage="Variables for your {url}"
                  values={{ url: <EuiCode>elastic/connectors/config.yml</EuiCode> }}
                />
              </h3>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>connector_id</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} data-test-subj="serverlessSearchConnectorConnectorId">
                <EuiCode>{connectorId}</EuiCode>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>service_type</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {Boolean(serviceType) && <EuiCode>{serviceType}</EuiCode>}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>elasticsearch.host</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCode>{elasticsearchUrl}</EuiCode>
              </EuiFlexItem>
            </EuiFlexGroup>
            {status === ConnectorStatus.CREATED && (
              <>
                <EuiSpacer />
                <EuiCallOut
                  title={i18n.translate('xpack.serverlessSearch.connectors.waitingForConnection', {
                    defaultMessage: 'Waiting for connection',
                  })}
                  color="warning"
                  iconType="iInCircle"
                />
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
