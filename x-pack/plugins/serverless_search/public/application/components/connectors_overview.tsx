/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';

import { docLinks } from '../../../common/doc_links';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { PLUGIN_ID } from '../../../common';
import { useConnectors } from '../hooks/api/use_connectors';
import { useCreateConnector } from '../hooks/api/use_create_connector';
import { useKibanaServices } from '../hooks/use_kibana';
import { EmptyConnectorsPrompt } from './connectors/empty_connectors_prompt';
import { ConnectorsTable } from './connectors/connectors_table';
import { ConnectorPrivilegesCallout } from './connectors/connector_config/connector_privileges_callout';

import { BASE_CONNECTORS_PATH, CONNECTORS, ELASTIC_MANAGED_CONNECTOR_PATH } from '../constants';

const CALLOUT_KEY = 'search.connectors.ElasticManaged.ComingSoon.feedbackCallout';

export const ConnectorsOverview = () => {
  const { data, isLoading: connectorsLoading } = useConnectors();
  const { http, console: consolePlugin } = useKibanaServices();
  const { createConnector, isLoading } = useCreateConnector();
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const canManageConnectors = !data || data.canManageConnectors;

  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const [showCallOut, setShowCallOut] = useState(sessionStorage.getItem(CALLOUT_KEY) !== 'hidden');

  const onDismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem(CALLOUT_KEY, 'hidden');
  };

  return (
    <EuiPageTemplate offset={0} grow restrictWidth data-test-subj="svlSearchConnectorsPage">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.serverlessSearch.connectors.title', {
          defaultMessage: 'Connectors',
        })}
        data-test-subj="serverlessSearchConnectorsTitle"
        restrictWidth
        rightSideItems={
          connectorsLoading || (data?.connectors || []).length > 0
            ? [
                <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
                  <EuiFlexItem>
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="xs"
                      justifyContent="flexEnd"
                      direction="row"
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          size="s"
                          type={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/github.svg`)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <EuiLink
                            data-test-subj="serverlessSearchConnectorsOverviewElasticConnectorsLink"
                            target="_blank"
                            href={CONNECTORS.github_repo}
                          >
                            {i18n.translate('xpack.serverlessSearch.connectorsPythonLink', {
                              defaultMessage: 'elastic/connectors',
                            })}
                          </EuiLink>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      data-test-subj="serverlessSearchConnectorsOverviewCreateConnectorButton"
                      disabled={!canManageConnectors}
                      isLoading={isLoading}
                      fill
                      iconType="plusInCircleFilled"
                      onClick={() => createConnector()}
                    >
                      {i18n.translate('xpack.serverlessSearch.connectors.createConnector', {
                        defaultMessage: 'Create connector',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>,
              ]
            : undefined
        }
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
                    external
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
        <ConnectorPrivilegesCallout />
        {connectorsLoading || (data?.connectors || []).length > 0 ? (
          <>
            {showCallOut && (
              <>
                <EuiCallOut
                  size="m"
                  title="Coming soon Elastic managed connectors."
                  iconType="pin"
                  onDismiss={onDismiss}
                >
                  <p>
                    {i18n.translate(
                      'xpack.serverlessSearch.connectorsOverview.calloutDescription',
                      {
                        defaultMessage:
                          "We're actively developing Elastic managed connectors, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project.",
                      }
                    )}
                  </p>
                  <EuiButton
                    data-test-subj="serverlessSearchConnectorsOverviewLinkButtonButton"
                    color="primary"
                    onClick={() =>
                      navigateToUrl(`${BASE_CONNECTORS_PATH}/${ELASTIC_MANAGED_CONNECTOR_PATH}`)
                    }
                  >
                    {LEARN_MORE_LABEL}
                  </EuiButton>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            )}
            <ConnectorsTable />
          </>
        ) : (
          <EmptyConnectorsPrompt />
        )}
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
