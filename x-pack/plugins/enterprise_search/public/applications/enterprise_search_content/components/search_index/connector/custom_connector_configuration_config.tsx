/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const ConnectorConfigurationConfig: React.FC = () => {
  return (
    <ConnectorConfigurationConfig>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.enterpriseSearch.content.indices.configurationConnector.config.description.firstParagraph"
          defaultMessage="Now that your connector is deployed, enhance the deployed connector client for your custom data source. There’s an {link} for you to start adding your data source specific implementation logic."
          values={{
            link: (
              <EuiLink
                href="https://github.com/elastic/connectors-ruby/tree/main/lib/connectors/example"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.config.connectorClientLink',
                  { defaultMessage: 'example connector client' }
                )}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer />
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.config.description.secondParagraph',
            {
              defaultMessage:
                'While the connector clients in the repository are built in Ruby, there’s no technical limitation to only use Ruby. Build a connector client with the technology that works best for your skillset.',
            }
          )}
        </p>
        <FormattedMessage
          id="xpack.enterpriseSearch.content.indices.configurationConnector.config.description.thirdParagraph"
          defaultMessage="If you need help, you can always open an {issuesLink} in the repository or ask a question in our {discussLink} forum."
          values={{
            discussLink: (
              <EuiLink href="https://discuss.elastic.co/c/enterprise-search/84" target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.config.discussLink',
                  { defaultMessage: 'Discuss' }
                )}
              </EuiLink>
            ),
            issuesLink: (
              <EuiLink href="https://github.com/elastic/connectors-ruby/issues" target="_blank">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.config.issuesLink',
                  { defaultMessage: 'issue' }
                )}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer />
        <EuiCallOut
          iconType="alert"
          color="warning"
          title={i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.config.warning.title',
            { defaultMessage: 'This connector is tied to your Elastic index' }
          )}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.warning.description',
            {
              defaultMessage:
                'If you sync at least one document before you’ve finalized your connector client, you will have to recreate your search index.',
            }
          )}
        </EuiCallOut>
      </EuiText>
    </ConnectorConfigurationConfig>
  );
};
