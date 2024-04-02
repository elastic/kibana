/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';

import { useValues } from 'kea';

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

import { Connector, ConnectorStatus, ElasticsearchIndex } from '@kbn/search-connectors';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonEmptyTo, EuiButtonTo } from '../../../shared/react_router_helpers';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../routes';
import {
  connectorStatusToColor,
  connectorStatusToText,
} from '../../utils/connector_status_helpers';

import { ConnectorDetailTabId } from './connector_detail';

export interface ConnectorStatsProps {
  connector: Connector;
  indexData?: ElasticsearchIndex;
}

export interface StatCardProps {
  content: ReactNode;
  footer: ReactNode;
  title: string;
}

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

const seeDocumentsLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.seeDocumentsTextLabel',
  {
    defaultMessage: 'See documents',
  }
);

const pipelinesLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.managePipelines',
  {
    defaultMessage: 'Manage pipelines',
  }
);

const configureLabel = i18n.translate(
  'xpack.enterpriseSearch.connectors.connectorStats.configureLink',
  {
    defaultMessage: 'Configure',
  }
);

export const ConnectorStats: React.FC<ConnectorStatsProps> = ({ connector, indexData }) => {
  const { connectorTypes } = useValues(KibanaLogic);
  const connectorDefinition = connectorTypes.find((c) => c.serviceType === connector.service_type);
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
            <EuiFlexGroup
              gutterSize="m"
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
            >
              {connectorDefinition && connectorDefinition.iconPath && (
                <EuiFlexItem grow={false}>
                  <EuiIcon type={connectorDefinition.iconPath} size="xl" />
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiText>
                  <p>{connectorDefinition?.name ?? '-'}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={connectorStatusToColor(connector?.status, !!connector?.index_name)}
                >
                  {connectorStatusToText(connector?.status, !!connector?.index_name)}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          footer={
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
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
                              documentAmount: indexData?.count ?? 0,
                            },
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmptyTo
                  isDisabled={!(connector.index_name && indexData)}
                  size="s"
                  to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                    connectorId: connector.id,
                    tabId: ConnectorDetailTabId.DOCUMENTS,
                  })}
                >
                  {seeDocumentsLabel}
                </EuiButtonEmptyTo>
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
              indexData ? (
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiBadge>{connector.index_name}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiHealth color="success" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <EuiText size="s" color="warning">
                  {i18n.translate(
                    'xpack.enterpriseSearch.connectors.connectorStats.indexDoesntExistLabel',
                    {
                      defaultMessage: "Index doesn't exist",
                    }
                  )}
                </EuiText>
              )
            ) : (
              <EuiText size="s" color="danger">
                {i18n.translate('xpack.enterpriseSearch.connectors.connectorStats.noIndexLabel', {
                  defaultMessage: 'No index attached yet',
                })}
              </EuiText>
            )
          }
          footer={
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {[ConnectorStatus.CONNECTED, ConnectorStatus.CONFIGURED].includes(
                  connector.status
                ) && connector.index_name ? (
                  <EuiButtonEmptyTo
                    size="s"
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.CONFIGURATION,
                    })}
                  >
                    {configureLabel}
                  </EuiButtonEmptyTo>
                ) : (
                  <EuiButtonTo
                    color="primary"
                    size="s"
                    fill
                    to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                      connectorId: connector.id,
                      tabId: ConnectorDetailTabId.CONFIGURATION,
                    })}
                  >
                    {configureLabel}
                  </EuiButtonTo>
                )}
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
                <EuiButtonEmptyTo
                  isDisabled={!connector.index_name}
                  size="s"
                  to={generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
                    connectorId: connector.id,
                    tabId: ConnectorDetailTabId.PIPELINES,
                  })}
                >
                  {pipelinesLabel}
                </EuiButtonEmptyTo>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
