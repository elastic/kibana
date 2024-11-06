/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiButton,
  EuiToolTip,
  EuiBadge,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { css } from '@emotion/react';
import { useKibanaServices } from '../../hooks/use_kibana';
import { docLinks } from '../../../../common/doc_links';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useCreateConnector } from '../../hooks/api/use_create_connector';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';
import { useConnectors } from '../../hooks/api/use_connectors';

import { CONNECTORS, ELASTIC_MANAGED_CONNECTOR_PATH, BASE_CONNECTORS_PATH } from '../../constants';

export const EmptyConnectorsPrompt: React.FC = () => {
  const connectorTypes = useConnectorTypes();

  const getConnectorByName = (connectors: typeof connectorTypes, serviceType: string) => {
    return connectors.find((connector) => connector.serviceType === serviceType);
  };

  const connectorIcon = (connector: { name: string; serviceType: string; iconPath?: string }) => {
    return (
      <EuiToolTip content={connector.name}>
        <EuiIcon
          size="l"
          title={connector?.name}
          id={connector?.serviceType}
          type={connector?.iconPath || 'defaultIcon'}
        />
      </EuiToolTip>
    );
  };

  const connectorExample1 = getConnectorByName(connectorTypes, 'gmail');
  const connectorExample2 = getConnectorByName(connectorTypes, 'sharepoint_online');
  const connectorExample3 = getConnectorByName(connectorTypes, 'jira');
  const connectorExample4 = getConnectorByName(connectorTypes, 'dropbox');

  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const { createConnector, isLoading } = useCreateConnector();
  const { data } = useConnectors();

  const assetBasePath = useAssetBasePath();
  const connectorsPath = assetBasePath + '/connectors.svg';
  const horizontalSteps: EuiStepsHorizontalProps['steps'] = [
    {
      title: '',
      status: 'incomplete',
      onClick: () => {},
    },
    {
      title: '',
      status: 'incomplete',
      onClick: () => {},
    },
    {
      title: '',
      status: 'incomplete',
      onClick: () => {},
    },
  ];
  return (
    <EuiFlexGroup alignItems="center" direction="column">
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            gutterSize="l"
          >
            <EuiFlexItem>
              <EuiIcon size="xxl" type={connectorsPath} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.connectorsEmpty.title', {
                    defaultMessage: 'Set up a new connector',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate('xpack.serverlessSearch.connectorsEmpty.description', {
                    defaultMessage:
                      "To set up and deploy a connector you'll be working between the third-party data source, your terminal, and the Elasticsearch serverless UI. The high level process looks like this:",
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup
              alignItems="stretch"
              justifyContent="center"
              direction="column"
              gutterSize="s"
            >
              <EuiFlexItem>
                <EuiPanel color="subdued">
                  <EuiFlexItem grow={false}>
                    <EuiStepsHorizontal
                      css={css`
                        pointer-events: none;
                      `}
                      steps={horizontalSteps}
                      size="s"
                      role="presentation"
                      // @ts-ignore
                      inert=""
                    />
            <EuiFlexItem>
              <EuiPanel color="subdued">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="primary" size="l" type="documents" />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText>
                          <p>
                            {i18n.translate(
                              'xpack.serverlessSearch.connectorsEmpty.guideOneDescription',
                              {
                                defaultMessage: "Choose a data source you'd like to sync",
                              }
                            )}
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
                      <EuiFlexItem grow={false}>
                        <EuiIcon color="primary" size="l" type={connectorsPath} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText>
                          <p>
                            <FormattedMessage
                              id="xpack.serverlessSearch.connectorsEmpty.guideTwoDescription"
                              defaultMessage="Deploy connector code on your own infrastructure by running from {source}, or using {docker}"
                              values={{
                                source: (
                                  <EuiLink
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
                            <EuiFlexItem grow={false}>
                              {connectorExample1 && connectorIcon(connectorExample1)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample2 && connectorIcon(connectorExample2)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiIcon color="primary" size="l" type="documents" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample3 && connectorIcon(connectorExample3)}
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {connectorExample4 && connectorIcon(connectorExample4)}
                            </EuiFlexItem>
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
                            <EuiIcon color="primary" size="l" type={connectorsPath} />
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
                                      href={CONNECTORS.github_repo}
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
                                      href={CONNECTORS.docker_doc}
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
                              <EuiIcon color="primary" size="l" type={connectorsPath} />
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
            {/* <EuiSpacer size="xs" /> */}
            <EuiFlexGroup direction="row" gutterSize="m">
              <EuiFlexItem>
                <EuiButton
                  data-test-subj="serverlessSearchEmptyConnectorsPromptCreateSelfManagedConnectorButton"
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
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                data-test-subj="serverlessSearchEmptyConnectorsPromptCreateConnectorButton"
                disabled={!data?.canManageConnectors}
                fill
                iconType="plusInCircleFilled"
                onClick={() => createConnector()}
                isLoading={isLoading}
              >
                {i18n.translate('xpack.serverlessSearch.connectorsEmpty.createConnector', {
                  defaultMessage: 'Create connector',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
