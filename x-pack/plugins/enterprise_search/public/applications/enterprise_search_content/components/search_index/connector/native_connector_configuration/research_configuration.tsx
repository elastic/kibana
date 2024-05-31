/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorDefinition } from '@kbn/search-connectors-plugin/common/types';

interface ResearchConfigurationProps {
  nativeConnector: ConnectorDefinition;
}
export const ResearchConfiguration: React.FC<ResearchConfigurationProps> = ({
  nativeConnector,
}) => {
  const { docsUrl, externalDocsUrl, name } = nativeConnector;

  return (
    <>
      <EuiText size="s">
        {i18n.translate(
          'xpack.enterpriseSearch.content.indices.configurationConnector.researchConfiguration.description',
          {
            defaultMessage:
              'This connector supports several authentication methods. Ask your administrator for the correct connection credentials.',
          }
        )}
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup direction="row" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiLink target="_blank" href={docsUrl}>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.researchConfiguration.connectorDocumentationLinkLabel',
              {
                defaultMessage: 'Documentation',
              }
            )}
          </EuiLink>
        </EuiFlexItem>
        {externalDocsUrl && (
          <EuiFlexItem grow={false}>
            <EuiLink target="_blank" href={externalDocsUrl}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.researchConfiguration.serviceDocumentationLinkLabel',
                {
                  defaultMessage: '{name} documentation',
                  values: { name },
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
