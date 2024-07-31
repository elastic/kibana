/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiLink, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ConnectorDefinition } from '@kbn/search-connectors-plugin/common/types';

interface ResearchConfigurationProps {
  nativeConnector: ConnectorDefinition;
}
export const ResearchConfiguration: React.FC<ResearchConfigurationProps> = ({
  nativeConnector,
}) => {
  const { docsUrl, externalDocsUrl, name } = nativeConnector;

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.enterpriseSearch.researchConfiguration.euiText.checkRequirementsLabel"
          defaultMessage="Check Requirements"
        />
      }
      iconType="iInCircle"
    >
      <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.researchConfiguration.p.referToTheDocumentationLabel"
                defaultMessage="Refer to the documentation for this connector to learn about prerequisites for connecting to {serviceType} and configuration requirements."
                values={{
                  serviceType: name,
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="enterpriseSearchResearchConfigurationDocumentationLink"
              target="_blank"
              href={docsUrl}
            >
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
              <EuiLink
                data-test-subj="enterpriseSearchResearchConfigurationNameDocumentationLink"
                target="_blank"
                href={externalDocsUrl}
              >
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
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
