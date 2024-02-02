/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';

import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiLink,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector } from '@kbn/search-connectors';

import { ConnectorIndex } from '../../../../../common/types/indices';

import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { CONNECTORS } from '../search_index/connector/constants';

export interface ConnectorStatsProps {
  connector: Connector;
  indexData?: ConnectorIndex;
}

export interface StatCardProps {
  content: ReactNode;
  footer: ReactNode;
  title: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, content, footer }) => {
  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{content}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow={false} color="subdued">
        {footer}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

export const ConnectorStats: React.FC<ConnectorStatsProps> = ({ connector, indexData }) => {
  const connectorDefinition = CONNECTORS.find((c) => c.serviceType === connector.service_type);
  return (
    <EuiFlexGrid columns={3} direction="row">
      <EuiFlexItem>
        <StatCard
          title={i18n.translate(
            'xpack.enterpriseSearch.connectors.connectorStats.h4.connectorLabel',
            {
              defaultMessage: 'Connector',
            }
          )}
          content={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
                  {connectorDefinition && connectorDefinition.icon && (
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={connectorDefinition.icon} size="xl" />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem>
                    <EuiText>
                      <p>{connectorDefinition?.name ?? '-'}</p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color={connectorStatusToColor(connector?.status)}>
                  {connectorStatusToText(connector?.status)}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          footer={
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="documents" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.connectors.connectorStats.p.DocumentsLabel',
                          {
                            defaultMessage: '{documentAmount} Documents',
                            values: {
                              documentAmount: indexData?.total.docs.count ?? '-',
                            },
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink>
                  <EuiText textAlign="right">
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.seeDocumentsTextLabel',
                      {
                        defaultMessage: 'See documents',
                      }
                    )}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      {
        // <EuiFlexItem>
        //   <StatCard
        //     title="Sync frequency"
        //     content={'Recurring syncs every ** at **'}
        //     footer={
        //       <EuiFlexGroup>
        //         <EuiFlexItem>
        //           <EuiLink>
        //             <EuiText textAlign="right">
        //               {i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.schedulingLink', {
        //                 defaultMessage: 'Scheduling',
        //               })}
        //             </EuiText>
        //           </EuiLink>
        //         </EuiFlexItem>
        //       </EuiFlexGroup>
        //     }
        //   />
        // </EuiFlexItem>
      }
      {
        // <EuiFlexItem>
        //   <StatCard
        //     title="Sync rules"
        //     content={
        //       <EuiFlexGroup gutterSize="s">
        //         <EuiFlexItem grow={false}>
        //           <EuiBadge color="success" iconType="plusInCircle">
        //             2 include policies
        //           </EuiBadge>
        //         </EuiFlexItem>
        //         <EuiFlexItem grow={false}>
        //           <EuiBadge color="danger" iconType="minusInCircle">
        //             2 include policies
        //           </EuiBadge>
        //         </EuiFlexItem>
        //       </EuiFlexGroup>
        //     }
        //     footer={
        //       <EuiFlexGroup>
        //         <EuiFlexItem>
        //           <EuiLink>
        //             <EuiText textAlign="right">
        //               {i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.syncRulesLink', {
        //                 defaultMessage: 'Sync rules',
        //               })}
        //             </EuiText>
        //           </EuiLink>
        //         </EuiFlexItem>
        //       </EuiFlexGroup>
        //     }
        //   />
        // </EuiFlexItem>
      }
      <EuiFlexItem>
        <StatCard
          title="Index"
          content={
            connector.index_name ? (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiBadge>{connector.index_name}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiHealth color="success" />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noIndex', {
                defaultMessage: 'No index related',
              })
            )
          }
          footer={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiLink>
                  <EuiText textAlign="right">
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.configureLink',
                      {
                        defaultMessage: 'Configure',
                      }
                    )}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <StatCard
          title={i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.pipelinesTitle', {
            defaultMessage: 'Pipelines',
          })}
          content={
            connector.pipeline ? (
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiBadge>{connector.pipeline.name}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noPipelineText', {
                defaultMessage: 'None',
              })
            )
          }
          footer={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiLink>
                  <EuiText textAlign="right">
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.configureLink',
                      {
                        defaultMessage: 'Configure',
                      }
                    )}
                  </EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
