/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FetchSyncJobsStatsApiLogic } from '../../api/stats/fetch_sync_jobs_stats_api_logic';

export interface ConnectorStatsProps {
  isCrawler: boolean;
}

export const ConnectorStats: React.FC<ConnectorStatsProps> = ({ isCrawler }) => {
  const { makeRequest } = useActions(FetchSyncJobsStatsApiLogic);
  const { data } = useValues(FetchSyncJobsStatsApiLogic);
  const connectorCount = (data?.connected || 0) + (data?.incomplete || 0);
  const hasMultipleConnectors = connectorCount > 1;

  useEffect(() => {
    makeRequest({ isCrawler });
  }, []);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSplitPanel.Outer hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h4>
                    {!isCrawler
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.h4.connectorSummaryLabel',
                          { defaultMessage: 'Connector summary' }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.h4.crawlerSummaryLabel',
                          { defaultMessage: 'Web crawler summary' }
                        )}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  {!isCrawler
                    ? hasMultipleConnectors
                      ? i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.multipleConnectorsText',
                          {
                            defaultMessage: '{count} connectors',
                            values: { count: connectorCount },
                          }
                        )
                      : i18n.translate(
                          'xpack.enterpriseSearch.connectorStats.singleConnectorText',
                          {
                            defaultMessage: '{count} connector',
                            values: { count: connectorCount },
                          }
                        )
                    : hasMultipleConnectors
                    ? i18n.translate('xpack.enterpriseSearch.connectorStats.multipleCrawlersText', {
                        defaultMessage: '{count} web crawlers',
                        values: { count: connectorCount },
                      })
                    : i18n.translate('xpack.enterpriseSearch.connectorStats.singleCrawlerText', {
                        defaultMessage: '{count} web crawler',
                        values: { count: connectorCount },
                      })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          <EuiSplitPanel.Inner grow={false} color="subdued">
            <EuiBadge color="success">
              {i18n.translate('xpack.enterpriseSearch.connectorStats.connectedBadgeLabel', {
                defaultMessage: '{number} connected',
                values: {
                  number: data?.connected || 0,
                },
              })}
            </EuiBadge>
            <EuiBadge color="warning">
              {i18n.translate('xpack.enterpriseSearch.connectorStats.incompleteBadgeLabel', {
                defaultMessage: '{number} incomplete',

                values: {
                  number: data?.incomplete || 0,
                },
              })}
            </EuiBadge>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSplitPanel.Outer hasShadow={false} hasBorder>
          <EuiSplitPanel.Inner>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiTitle size="xxxs">
                  <h4>
                    {i18n.translate('xpack.enterpriseSearch.connectorStats.h4.syncsStatusLabel', {
                      defaultMessage: 'Syncs status',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  {i18n.translate('xpack.enterpriseSearch.connectorStats.runningSyncsTextLabel', {
                    defaultMessage: '{syncs} running syncs',
                    values: {
                      syncs: data?.in_progress,
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>

          <EuiSplitPanel.Inner grow={false} color="subdued">
            {isCrawler
              ? i18n.translate(
                  'xpack.enterpriseSearch.connectorStats.crawlerSyncsOrphanedSyncsLabel',
                  {
                    defaultMessage: '{orphanedCount} Orphaned syncs / {errorCount} Sync errors',
                    values: {
                      errorCount: data?.errors || 0,
                      orphanedCount: data?.orphaned_jobs,
                    },
                  }
                )
              : i18n.translate(
                  'xpack.enterpriseSearch.connectorStats.connectorSyncsOrphanedSyncsLabel',
                  {
                    defaultMessage:
                      '{idleCount} Idle syncs  / {orphanedCount} Orphaned syncs / {errorCount} Sync errors',
                    values: {
                      errorCount: data?.errors || 0,
                      idleCount: data?.idle,
                      orphanedCount: data?.orphaned_jobs,
                    },
                  }
                )}
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
