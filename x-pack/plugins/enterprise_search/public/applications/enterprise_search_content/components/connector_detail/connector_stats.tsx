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
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector, ConnectorIndex } from '@kbn/search-connectors';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { CONNECTORS } from '../search_index/connector/constants';

import { ConnectorDetailTabId } from './connector_detail';

export interface ConnectorStatsProps {
  connector: Connector;
  indexData?: ConnectorIndex;
}

export interface StatCardProps {
  content: ReactNode;
  footer: ReactNode;
  title: string;
}

const noIndexText = i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noIndex', {
  defaultMessage: 'No index related',
});

export const StatCard: React.FC<StatCardProps> = ({ title, content, footer }) => {
  return (
    <EuiSplitPanel.Outer hasShadow={false} hasBorder grow>
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
                    <EuiText size="s">
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.connectors.connectorStats.p.DocumentsLabel',
                          {
                            defaultMessage: '{documentAmount} Documents',
                            values: {
                              documentAmount: indexData?.count ?? '-',
                            },
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                {connector.index_name ? (
                  <EuiLinkTo
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.DOCUMENTS,
                    })}
                  >
                    <EuiText size="s" textAlign="right">
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectors.connectorStats.seeDocumentsTextLabel',
                        {
                          defaultMessage: 'See documents',
                        }
                      )}
                    </EuiText>
                  </EuiLinkTo>
                ) : (
                  <EuiText size="s" textAlign="right">
                    {noIndexText}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
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
              noIndexText
            )
          }
          footer={
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiLinkTo
                  to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                    connectorId: connector.id,
                    tabId: ConnectorDetailTabId.CONFIGURATION,
                  })}
                >
                  <EuiText textAlign="right" size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectors.connectorStats.configureLink',
                      {
                        defaultMessage: 'Configure',
                      }
                    )}
                  </EuiText>
                </EuiLinkTo>
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
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {connector.index_name ? (
                  <EuiLinkTo
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.PIPELINES,
                    })}
                  >
                    <EuiText textAlign="right" size="s">
                      {i18n.translate(
                        'xpack.enterpriseSearch.connectors.connectorStats.managePipelines',
                        {
                          defaultMessage: 'Manage pipelines',
                        }
                      )}
                    </EuiText>
                  </EuiLinkTo>
                ) : (
                  <EuiText textAlign="right" size="s">
                    {noIndexText}
                  </EuiText>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
