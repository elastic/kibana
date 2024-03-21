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

export const ConnectorsCallout = () => {
  const { createConnector, isLoading } = useCreateConnector();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.serverlessSearch.selectClient.connectorsCallout.title', {
        defaultMessage: 'Sync your data using a connector client',
      })}
      size="m"
      iconType="iInCircle"
    >
      <p>
        <FormattedMessage
          id="xpack.serverlessSearch.selectClient.connectorsCallout.description"
          defaultMessage="Sync a range of popular third-party data sources to Elasticsearch, by deploying open code Elastic connectors on your own infrastructure."
        />
      </p>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
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
