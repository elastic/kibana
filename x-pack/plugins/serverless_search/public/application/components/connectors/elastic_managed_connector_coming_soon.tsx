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
  EuiBadge,
  EuiStepsHorizontal,
  EuiStepsHorizontalProps,
  EuiButtonEmpty,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

import { BACK_LABEL } from '../../../../common/i18n_string';

import { ConnectorIcon } from './connector_icon';

export const ElasticManagedConnectorComingSoon: React.FC = () => {
  const connectorTypes = useConnectorTypes();

  const connectorExamples = connectorTypes.filter((connector) =>
    ['gmail', 'sharepoint_online', 'jira', 'dropbox'].includes(connector.serviceType)
  );

  const {
    application: { navigateToUrl },
  } = useKibanaServices();

  const assetBasePath = useAssetBasePath();
  const connectorsIcon = assetBasePath + '/connectors.svg';
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
              <EuiButtonEmpty
                data-test-subj="serverlessSearchElasticManagedConnectorEmptyBackButton"
                iconType="arrowLeft"
                onClick={() => navigateToUrl(`./`)}
              >
                {BACK_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiIcon size="xxl" type={connectorsIcon} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.serverlessSearch.elasticManagedConnectorEmpty.title', {
                    defaultMessage: 'Elastic managed connectors',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiBadge color="accent">Coming soon</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText textAlign="center" color="subdued">
                <p>
                  {i18n.translate(
                    'xpack.serverlessSearch.elasticManagedConnectorEmpty.description',
                    {
                      defaultMessage:
                        "We're actively developing Elastic managed connectors, that won't require any self-managed infrastructure. You'll be able to handle all configuration in the UI. This will simplify syncing your data into a serverless Elasticsearch project. This new workflow will have two steps:",
                    }
                  )}
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
                    {/* This is a presentational component, not intended for user interaction:
                    pointer-events: none, prevents user interaction with the component.
                    inert prevents click, focus, and other interactive events, removing it from the tab order.
                    role="presentation" indicates that this component is purely decorative and not interactive for assistive technologies.
                    Together, these attributes help ensure the component passes an accessibility audit. */}
                    <EuiStepsHorizontal
                      css={css`
                        pointer-events: none;
                      `}
                      steps={horizontalSteps}
                      size="s"
                      role="presentation"
                      // @ts-ignore overriding a compiler error
                      inert=""
                    />
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
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
