/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, useState } from 'react';

import { GithubLink } from '@kbn/search-api-panels';
import { SearchEmptyPrompt, DecorativeHorizontalStepper } from '@kbn/search-ui';
import { ConnectorIcon } from '@kbn/search-ui';
import { docLinks } from '../../../common/doc_links';
import { LEARN_MORE_LABEL } from '../../../common/i18n_string';
import { useConnectors } from '../hooks/api/use_connectors';
import { useCreateConnector } from '../hooks/api/use_create_connector';
import { useKibanaServices } from '../hooks/use_kibana';
import { ConnectorsTable } from './connectors/connectors_table';
import { ConnectorPrivilegesCallout } from './connectors/connector_config/connector_privileges_callout';
import { useAssetBasePath } from '../hooks/use_asset_base_path';
import { useConnectorTypes } from '../hooks/api/use_connector_types';

import { BASE_CONNECTORS_PATH, ELASTIC_MANAGED_CONNECTOR_PATH } from '../constants';

const CALLOUT_KEY = 'search.connectors.ElasticManaged.ComingSoon.feedbackCallout';

export const ConnectorsOverview = () => {
  const { data, isLoading: connectorsLoading } = useConnectors();
  const { console: consolePlugin } = useKibanaServices();
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
        rightSideItems={
          connectorsLoading || (data?.connectors || []).length > 0
            ? [
                <EuiFlexGroup direction="row" alignItems="center" justifyContent="center">
                  <EuiFlexItem>
                    <GithubLink
                      href={'https://github.com/elastic/connectors'}
                      label={i18n.translate('xpack.serverlessSearch.connectorsPythonLink', {
                        defaultMessage: 'elastic/connectors',
                      })}
                      assetBasePath={assetBasePath}
                      data-test-subj="serverlessSearchConnectorsOverviewElasticConnectorsLink"
                    />
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
          <SearchEmptyPrompt
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
                      <DecorativeHorizontalStepper stepCount={3} />
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
                                  'xpack.serverlessSearch.connectorsEmpty.guideOneDescription',
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
                          <EuiFlexGroup
                            gutterSize="s"
                            direction="row"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <EuiFlexItem grow={false}>
                              <EuiIcon color="primary" size="l" type={connectorsIcon} />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon size="m" type="sortRight" />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiIcon color="primary" size="l" type="launch" />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiFlexItem>
                            <EuiText>
                              <p>
                                <FormattedMessage
                                  id="xpack.serverlessSearch.connectorsEmpty.guideTwoDescription"
                                  defaultMessage="Deploy connector code on your own infrastructure by running from {source}, or using {docker}"
                                  values={{
                                    source: (
                                      <EuiLink
                                        target="_blank"
                                        data-test-subj="serverlessSearchEmptyConnectorsPromptSourceLink"
                                        href={docLinks.connectorsRunFromSource}
                                      >
                                        {i18n.translate(
                                          'xpack.serverlessSearch.connectorsEmpty.sourceLabel',
                                          { defaultMessage: 'source' }
                                        )}
                                      </EuiLink>
                                    ),
                                    docker: (
                                      <EuiLink
                                        target="_blank"
                                        data-test-subj="serverlessSearchEmptyConnectorsPromptDockerLink"
                                        href={docLinks.connectorsRunWithDocker}
                                      >
                                        {i18n.translate(
                                          'xpack.serverlessSearch.connectorsEmpty.dockerLabel',
                                          { defaultMessage: 'Docker' }
                                        )}
                                      </EuiLink>
                                    ),
                                  }}
                                />
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
                                <EuiIcon color="primary" size="l" type="documents" />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiIcon size="m" type="sortRight" />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiIcon color="primary" size="l" type={connectorsIcon} />
                              </EuiFlexItem>
                              <EuiFlexItem>
                                <EuiIcon size="m" type="sortRight" />
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
                                  'xpack.serverlessSearch.connectorsEmpty.guideThreeDescription',
                                  {
                                    defaultMessage:
                                      'Enter access and connection details for your data source and run your first sync',
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
            actions={
              <EuiFlexGroup direction="row" gutterSize="m">
                <EuiFlexItem>
                  <EuiButton
                    data-test-subj="serverlessSearchEmptyConnectorsPromptCreateConnectorButton"
                    disabled={!data?.canManageConnectors}
                    fill
                    iconType="plusInCircle"
                    onClick={() => createConnector()}
                    isLoading={isLoading}
                  >
                    {i18n.translate('xpack.serverlessSearch.connectorsEmpty.selfManagedButton', {
                      defaultMessage: 'Self-managed connector',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column" gutterSize="s" alignItems="center">
                    <EuiFlexItem>
                      <EuiButton
                        data-test-subj="serverlessSearchEmptyConnectorsPromptCreateElasticManagedConnectorButton"
                        isLoading={isLoading}
                        onClick={() =>
                          navigateToUrl(`${BASE_CONNECTORS_PATH}/${ELASTIC_MANAGED_CONNECTOR_PATH}`)
                        }
                      >
                        {i18n.translate(
                          'xpack.serverlessSearch.connectorsEmpty.elasticManagedButton',
                          {
                            defaultMessage: 'Elastic managed connector',
                          }
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="accent">Coming soon</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        )}
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
