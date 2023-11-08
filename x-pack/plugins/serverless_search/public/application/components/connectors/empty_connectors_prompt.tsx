/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PLUGIN_ID } from '../../../../common';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useKibanaServices } from '../../hooks/use_kibana';

export const EmptyConnectorsPrompt: React.FC = () => {
  const { http } = useKibanaServices();
  const { data: connectorTypes } = useConnectorTypes();
  const assetBasePath = http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets`);
  const connectorsPath = assetBasePath + '/connectors.svg';
  return (
    <EuiFlexGroup alignItems="center" direction="column">
      <EuiFlexItem>
        <EuiPanel paddingSize="l" hasShadow={false} hasBorder>
          <EuiFlexGroup alignItems="center" justifyContent="center" direction="column">
            <EuiFlexItem>
              <EuiIcon size="xxl" type={connectorsPath} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.connectorsEmpty.title', {
                    defaultMessage: 'Create a connector',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
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
                                  <EuiLink href="TODO TODO TODO">
                                    {i18n.translate(
                                      'xpack.serverlessSearch.connectorsEmpty.sourceLabel',
                                      { defaultMessage: 'source' }
                                    )}
                                  </EuiLink>
                                ),
                                docker: (
                                  <EuiLink href="TODO TODO TODO">
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
                    <EuiFlexGroup justifyContent="center" alignItems="center" direction="column">
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
            <EuiFlexItem>
              <EuiButton fill iconType="plusInCircleFilled">
                {i18n.translate('xpack.serverlessSearch.connectorsEmpty.createConnector', {
                  defaultMessage: 'Create connector',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle>
          <h3>
            {i18n.translate('xpack.serverlessSearch.connectorsEmpty.availableConnectors', {
              defaultMessage: 'Available connectors',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          {connectorTypes?.connectors.map((connectorType) => (
            <EuiFlexItem key={connectorType.name}>
              <EuiToolTip content={connectorType.name}>
                <EuiIcon
                  size="l"
                  title={connectorType.name}
                  id={connectorType.serviceType}
                  type={connectorType.iconPath}
                />
              </EuiToolTip>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
