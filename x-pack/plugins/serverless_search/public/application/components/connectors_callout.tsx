/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useConnectorTypes } from '../hooks/api/use_connector_types';
import { useCreateConnector } from '../hooks/api/use_create_connector';

const CONNECTOR_TYPES_DISPLAY = [
  'azure_blob_storage',
  'sharepoint_online',
  's3',
  'mongodb',
  'google_cloud_storage',
];

export const ConnectorsCallout = () => {
  const { data } = useConnectorTypes();
  const { createConnector, isLoading } = useCreateConnector();

  const allConnectorTypes = data?.connectors;
  const connectorTypes = allConnectorTypes
    ? CONNECTOR_TYPES_DISPLAY.map(
        (type) => allConnectorTypes.find((connType) => connType.serviceType === type)!
      )
    : undefined;
  const showConnectors = connectorTypes && connectorTypes.length;
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
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            data-test-subj="connectors-callout-cta"
            onClick={() => createConnector()}
            isLoading={isLoading}
          >
            {i18n.translate('xpack.serverlessSearch.selectClient.connectorsCallout.cta', {
              defaultMessage: 'Create a connector',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem />
        {showConnectors &&
          connectorTypes.map((connectorType) => (
            <EuiFlexItem grow={false} key={connectorType.serviceType}>
              <EuiToolTip content={connectorType.name}>
                <EuiIcon
                  size="xxl"
                  title={connectorType.name}
                  id={connectorType.serviceType}
                  type={connectorType.iconPath}
                />
              </EuiToolTip>
            </EuiFlexItem>
          ))}
        {showConnectors && (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <FormattedMessage
                id="xpack.serverlessSearch.selectClient.connectorsCallout.etc"
                defaultMessage="and more"
              />
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
