/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { NativeConnector } from '../types';

interface ResearchConfigurationProps {
  nativeConnector: NativeConnector;
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
              '{name} supports a variety of authentication mechanisms which will be needed for this connector to connect to your instance. Consult with your administrator for the correct credentials to use to connect.',
            values: {
              name,
            },
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
      </EuiFlexGroup>
    </>
  );
};
