/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useCreateConnector } from '../hooks/api/use_create_connector';
import { useConnectors } from '../hooks/api/use_connectors';

export const ConnectorsCallout = () => {
  const { createConnector, isLoading } = useCreateConnector();
  const { data } = useConnectors();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.serverlessSearch.selectClient.connectorsCallout.title', {
        defaultMessage: 'Sync your data with a self-managed connector',
      })}
      size="s"
      iconType="iInCircle"
    >
      <p>
        <FormattedMessage
          id="xpack.serverlessSearch.selectClient.connectorsCallout.description"
          defaultMessage="Sync popular third-party data sources to Elasticsearch using open code connectors on your infrastructure."
        />
      </p>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            disabled={!data?.canManageConnectors}
            iconType="plusInCircle"
            data-test-subj="connectors-callout-cta"
            onClick={() => createConnector()}
            isLoading={isLoading}
          >
            {i18n.translate('xpack.serverlessSearch.selectClient.connectorsCallout.cta', {
              defaultMessage: 'Create a connector',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
