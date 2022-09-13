/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, EuiLink, EuiText } from '@elastic/eui';

import { ConnectorConfigurationConfig } from '../connector_configuration_config';
import { NativeConnector } from '../types';

interface NativeConnectorConfigurationConfigProps {
  nativeConnector: NativeConnector;
}

export const NativeConnectorConfigurationConfig: React.FC<
  NativeConnectorConfigurationConfigProps
> = ({ nativeConnector }) => {
  return (
    <ConnectorConfigurationConfig>
      <EuiText size="s">
        Set configuration and credentials for your connector.{' '}
        <EuiLink target="_blank" href={'' /* TODO needs link */}>
          Learn more about {nativeConnector.name} authentication
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title="Data source credentials are unencrypted"
      >
        <EuiText size="s">
          Encryption for data source credentials is unavailable in this technical preview. Your data
          source credentials will be stored, unencrypted, in Elasticsearch.
        </EuiText>
      </EuiCallOut>
    </ConnectorConfigurationConfig>
  );
};
