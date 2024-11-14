/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiPageTemplate, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';

import { LEARN_MORE_LABEL } from '../../../common/i18n_string';

import { useKibanaServices } from '../hooks/use_kibana';
import { ElasticManagedConnectorComingSoon } from './connectors/elastic_managed_connector_coming_soon';

import { docLinks } from '../../../common/doc_links';

export const ConnectorsElasticManaged = () => {
  const { console: consolePlugin } = useKibanaServices();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchConnectorsPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.connectors.title', {
          defaultMessage: 'Connectors',
        })}
        data-test-subj="serverlessSearchConnectorsTitle"
        restrictWidth
      >
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.serverlessSearch.connectors.headerContent"
              defaultMessage="Sync third-party data sources to Elasticsearch, by deploying Elastic connectors on your own infrastructure. {learnMoreLink}"
              values={{
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="serverlessSearchConnectorsOverviewLink"
                    target="_blank"
                    href={docLinks.connectors}
                  >
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth color="subdued">
        <ElasticManagedConnectorComingSoon />
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
