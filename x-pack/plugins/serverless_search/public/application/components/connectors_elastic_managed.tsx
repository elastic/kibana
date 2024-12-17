/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { SearchEmptyPrompt, DecorativeHorizontalStepper } from '@kbn/search-ui';
import { ConnectorIcon } from '@kbn/search-ui';
import { SERVERLESS_ES_CONNECTORS_ID } from '@kbn/deeplinks-search/constants';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { BACK_LABEL } from '../../../common/i18n_string';

import { useKibanaServices } from '../hooks/use_kibana';
import { useAssetBasePath } from '../hooks/use_asset_base_path';
import { useConnectorTypes } from '../hooks/api/use_connector_types';

import { docLinks } from '../../../common/doc_links';

export const ConnectorsElasticManaged = () => {
  const { console: consolePlugin } = useKibanaServices();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const {
    application: { navigateToApp },
  } = useKibanaServices();

  const connectorTypes = useConnectorTypes();

  const connectorExamples = connectorTypes.filter((connector) =>
    ['Gmail', 'Sharepoint Online', 'Jira Cloud', 'Dropbox'].includes(connector.name)
  );

  const assetBasePath = useAssetBasePath();
  const connectorsIcon = assetBasePath + '/connectors.svg';

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
        <SearchEmptyPrompt
          backButton={{
            label: BACK_LABEL,
            onClickBack: () => navigateToApp(SERVERLESS_ES_CONNECTORS_ID),
          }}
          icon={connectorsIcon}
          title={i18n.translate('xpack.serverlessSearch.elasticManagedConnectorEmpty.title', {
            defaultMessage: 'Elastic managed connectors',
          })}
          description={i18n.translate(
            'xpack.serverlessSearch.elasticManagedConnectorEmpty.description',
            {
              defaultMessage:
                "We're actively developing Elastic managed connectors, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
            }
          )}
          isComingSoon
          body={
            <EuiFlexGroup
              alignItems="stretch"
              justifyContent="center"
              direction="column"
              gutterSize="s"
            >
              <EuiFlexItem>
                <EuiPanel color="subdued">
                  <EuiFlexItem grow={false}>
                    <DecorativeHorizontalStepper stepCount={2} />
                  </EuiFlexItem>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            justifyContent="center"
                            alignItems="center"
                            direction="row"
                            gutterSize="s"
                          >
                            {connectorExamples.map((connector, index) => (
                              <React.Fragment key={connector.serviceType}>
                                {index === Math.floor(connectorExamples.length / 2) && (
                                  <EuiFlexItem grow={false}>
                                    <EuiIcon color="primary" size="l" type="documents" />
                                  </EuiFlexItem>
                                )}
                                <EuiFlexItem grow={false}>
                                  <ConnectorIcon
                                    name={connector.name}
                                    serviceType={connector.serviceType}
                                    iconPath={connector.iconPath}
                                    showTooltip
                                  />
                                </EuiFlexItem>
                              </React.Fragment>
                            ))}
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedConnectorEmpty.guideOneDescription',
                                {
                                  defaultMessage:
                                    "Choose from over 30 third-party data sources you'd like to sync",
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup
                        justifyContent="flexStart"
                        alignItems="center"
                        direction="column"
                      >
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup
                            gutterSize="s"
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type={connectorsIcon} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="logoElastic" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem>
                          <EuiText>
                            <p>
                              {i18n.translate(
                                'xpack.serverlessSearch.elasticManagedConnectorEmpty.guideThreeDescription',
                                {
                                  defaultMessage:
                                    'Enter access and connection details for your data source and run your first sync using the Kibana UI',
                                }
                              )}
                            </p>
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
