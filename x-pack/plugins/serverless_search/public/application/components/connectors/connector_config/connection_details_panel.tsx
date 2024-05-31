/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiTitle,
  EuiCode,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { ConnectorStatus } from '@kbn/search-connectors';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useElasticsearchUrl } from '../../../hooks/use_elastisearch_url';

interface ConnectionDetailsProps {
  connectorId: string;
  serviceType: string | null;
  status: ConnectorStatus;
}

export const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({
  connectorId,
  serviceType,
  status,
}) => {
  const { elasticsearchUrl } = useElasticsearchUrl();
  return (
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
    </EuiPanel>
  );
};
