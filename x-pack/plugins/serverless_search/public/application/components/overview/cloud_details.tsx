/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiThemeProvider,
  EuiTitle,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { OverviewPanel } from '@kbn/search-api-panels';

export interface CloudDetailsPanelProps {
  cloudId?: string;
  elasticsearchUrl?: string;
}

enum CloudDetail {
  ElasticsearchEndpoint = 'es_url',
  CloudId = 'cloud_id',
}

export const CloudDetailsPanel = ({ cloudId, elasticsearchUrl }: CloudDetailsPanelProps) => {
  const [selectedDetail, setSelectedCloudDetail] = useState<CloudDetail>(
    CloudDetail.ElasticsearchEndpoint
  );
  return (
    <OverviewPanel
      description={i18n.translate('xpack.serverlessSearch.cloudIdDetails.description', {
        defaultMessage: 'Get ready to ingest and query your data by choosing a connection option:',
      })}
      leftPanelContent={
        <EuiThemeProvider colorMode="dark">
          <EuiPanel paddingSize="xs">
            <EuiCodeBlock isCopyable fontSize="m" className="serverlessSearchCloudDetailsCopyPanel">
              {selectedDetail === CloudDetail.CloudId && cloudId}
              {selectedDetail === CloudDetail.ElasticsearchEndpoint && elasticsearchUrl}
            </EuiCodeBlock>
          </EuiPanel>
        </EuiThemeProvider>
      }
      links={[]}
      title={i18n.translate('xpack.serverlessSearch.cloudIdDetails.title', {
        defaultMessage: 'Copy your connection details',
      })}
    >
      <EuiSpacer size="l" />
      <EuiCheckableCard
        id={CloudDetail.ElasticsearchEndpoint}
        name={CloudDetail.ElasticsearchEndpoint}
        label={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.serverlessSearch.cloudIdDetails.elasticsearchEndpoint.title"
                    defaultMessage="Elasticsearch endpoint"
                  />
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span>
                <EuiBadge color="success">
                  <FormattedMessage
                    id="xpack.serverlessSearch.cloudIdDetails.elasticsearchEndpoint.recommendedBadge"
                    defaultMessage="Recommended"
                  />
                </EuiBadge>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        checked={selectedDetail === CloudDetail.ElasticsearchEndpoint}
        onChange={() => setSelectedCloudDetail(CloudDetail.ElasticsearchEndpoint)}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.cloudIdDetails.elasticsearchEndpoint.description"
              defaultMessage="The most common method for establishing an Elasticsearch connection."
            />
          </p>
        </EuiText>
      </EuiCheckableCard>
      <EuiSpacer />
      <EuiCheckableCard
        id={CloudDetail.CloudId}
        name={CloudDetail.CloudId}
        label={
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.serverlessSearch.cloudIdDetails.cloudId.title"
                defaultMessage="Cloud ID"
              />
            </h5>
          </EuiTitle>
        }
        checked={selectedDetail === CloudDetail.CloudId}
        onChange={() => setSelectedCloudDetail(CloudDetail.CloudId)}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.cloudIdDetails.cloudId.description"
              defaultMessage="Specific client libraries and connectors can use this unique identifier specific to Elastic Cloud."
            />
          </p>
        </EuiText>
      </EuiCheckableCard>
    </OverviewPanel>
  );
};
