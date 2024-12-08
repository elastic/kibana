/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiTitle, EuiCode, EuiSpacer, EuiText, EuiCodeBlock } from '@elastic/eui';
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
  const codeBlock = `connectors:
-
  connector_id: ${connectorId}
  service_type: ${serviceType}
  api_key:
elasticsearch:
  host: ${elasticsearchUrl}
  api_key:`;
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
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.serverlessSearch.connectors.config.apiKeyExplanation"
          defaultMessage="You will need to fill in the {api_key} fields with an API key. One can be generated on the Getting Started page."
          values={{
            api_key: <EuiCode>api_key</EuiCode>,
          }}
        />
      </EuiText>
      <EuiSpacer />
      <EuiCodeBlock language="yaml" isCopyable>
        {codeBlock}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
