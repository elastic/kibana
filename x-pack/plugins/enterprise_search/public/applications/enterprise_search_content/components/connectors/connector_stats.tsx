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

export const ConnectorStats: React.FC = () => {
  const { makeRequest } = useActions(FetchSyncJobsStatsApiLogic);
  const { data } = useValues(FetchSyncJobsStatsApiLogic);

  useEffect(() => {
    makeRequest({});
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
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectorStats.h4.connectorSummaryLabel',
                      { defaultMessage: 'Connector summary' }
                    )}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  {i18n.translate('xpack.enterpriseSearch.connectorStats.connectorsTextLabel', {
                    defaultMessage: '{count} connectors',
                    values: {
                      count: (data?.connected || 0) + (data?.incomplete || 0),
                    },
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
            {i18n.translate('xpack.enterpriseSearch.connectorStats.idleSyncsOrphanedSyncsLabel', {
              defaultMessage:
                '{idleCount} Idle syncs  / {orphanedCount} Orphaned syncs / {errorCount} Sync errors',
              values: {
                errorCount: data?.errors || 0,
                idleCount: data?.idle,
                orphanedCount: data?.orphaned_jobs,
              },
            })}
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
