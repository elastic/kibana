/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useCreateConnector } from '../../hooks/api/use_create_connector';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { CONNECTORS } from '../../constants';

export const EmptyConnectorsPrompt: React.FC = () => {
  const connectorTypes = useConnectorTypes();
  const allConnectors = connectorTypes ? connectorTypes.map((connectorType) => connectorType) : [];

  const getRandomConnectors = (connectors: typeof allConnectors, count: number) => {
    const shuffled = connectors.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const [randomConnectors, setRandomConnectors] = useState(() =>
    getRandomConnectors(allConnectors, 4)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRandomConnectors(getRandomConnectors(allConnectors, 4));
    }, 5000);

    return () => clearInterval(interval);
  });

  const [connectorExample1, connectorExample2, connectorExample3, connectorExample4] =
    randomConnectors;
  const { createConnector, isLoading } = useCreateConnector();

  const assetBasePath = useAssetBasePath();
  const connectorsPath = assetBasePath + '/connectors.svg';
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
            <EuiFlexItem>
              <EuiPanel color="subdued">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup
                          justifyContent="center"
                          alignItems="center"
                          direction="row"
                          gutterSize="s"
                        >
                          <EuiFlexItem grow={false}>
                            {connectorExample1 && (
                              <EuiToolTip content={connectorExample1.name}>
                                <EuiIcon
                                  size="l"
                                  title={connectorExample1?.name}
                                  id={connectorExample1?.serviceType}
                                  type={connectorExample1?.iconPath || 'defaultIcon'}
                                />
                              </EuiToolTip>
                            )}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {connectorExample2 && (
                              <EuiToolTip content={connectorExample2.name}>
                                <EuiIcon
                                  size="l"
                                  title={connectorExample2?.name}
                                  id={connectorExample2?.serviceType}
                                  type={connectorExample2?.iconPath || 'defaultIcon'}
                                />
                              </EuiToolTip>
                            )}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiIcon color="primary" size="l" type="documents" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {connectorExample3 && (
                              <EuiToolTip content={connectorExample3.name}>
                                <EuiIcon
                                  size="l"
                                  title={connectorExample3?.name}
                                  id={connectorExample3?.serviceType}
                                  type={connectorExample3?.iconPath || 'defaultIcon'}
                                />
                              </EuiToolTip>
                            )}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {connectorExample4 && (
                              <EuiToolTip content={connectorExample4.name}>
                                <EuiIcon
                                  size="l"
                                  title={connectorExample4?.name}
                                  id={connectorExample4?.serviceType}
                                  type={connectorExample4?.iconPath || 'defaultIcon'}
                                />
                              </EuiToolTip>
                            )}
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
                                  "Choose a third-party data source you'd like to sync",
                              }
                            )}
                          </p>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
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
                                    href="https://github.com/elastic/connectors/blob/main/scripts/stack/README.md"
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
                    <EuiFlexGroup justifyContent="flexStart" alignItems="center" direction="column">
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
            {/* <EuiSpacer size="m" /> */}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
