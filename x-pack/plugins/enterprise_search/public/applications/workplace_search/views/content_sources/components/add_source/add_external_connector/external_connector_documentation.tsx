/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

interface ExternalConnectorDocumentationProps {
  name: string;
  documentationUrl: string;
}

export const ExternalConnectorDocumentation: React.FC<ExternalConnectorDocumentationProps> = ({
  name,
  documentationUrl,
}) => {
  return (
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.contentSource.addExternalConnector.documentation.heading"
          defaultMessage="The {name} connector is fully customizable, and will be self-managed on the infrastructure of your choice."
          values={{
            name,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.enterpriseSearch.workplaceSearch.contentSource.addExternalConnector.documentation.description"
          defaultMessage="To be prepared for configuration, review our {deploymentGuideLink} for all prerequisites needed to quickly deploy the connector package. Finalize your configuration in Enterprise Search by setting the connector's URL and API key in the next step."
          values={{
            deploymentGuideLink: (
              <EuiLink target="_blank" href={documentationUrl}>
                <FormattedMessage
                  id="xpack.enterpriseSearch.workplaceSearch.contentSource.addExternalConnector.documentation.linkLabel"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <p>
        <EuiLink target="_blank" href={'https://discuss.elastic.co/c/enterprise-search/84'}>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.contentSource.addExternalConnector.documentation.discussLinkLabel"
            defaultMessage="Questions? Discuss here."
          />
        </EuiLink>
      </p>
      <p>
        <EuiLink target="_blank" href={'https://www.elastic.co/kibana/feedback'}>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.contentSource.addExternalConnector.documentation.feedbackLinkLabel"
            defaultMessage="We're always looking to improve. Share your feedback  "
          />
        </EuiLink>
      </p>
    </EuiText>
  );
};
