/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer, EuiLink, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../../shared/doc_links';

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
        {i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.encryptionWarningMessage',
          {
            defaultMessage:
              'Encryption for data source credentials is unavailable in this technical preview. Your data source credentials will be stored, unencrypted, in Elasticsearch.',
          }
        )}
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiLink href={docLinks.elasticsearchSecureCluster} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.securityDocumentationLinkLabel',
              {
                defaultMessage: 'Learn more about Elasticsearch security',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
        {nativeConnector.externalAuthDocsUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink href={nativeConnector.externalAuthDocsUrl} target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.config.sourceSecurityDocumentationLinkLabel',
                {
                  defaultMessage: '{name} authentication',
                  values: {
                    name: nativeConnector.name,
                  },
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </ConnectorConfigurationConfig>
  );
};
