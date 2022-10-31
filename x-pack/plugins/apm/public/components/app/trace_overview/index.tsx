/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { TraceSearchType } from '../../../../common/trace_explorer';
import { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';
import { useTraceExplorerEnabledSetting } from '../../../hooks/use_trace_explorer_enabled_setting';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';

export function TraceOverview({ children }: { children: React.ReactElement }) {
  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const router = useApmRouter();

  const { query } = useApmParams('/traces');

  const routePath = useApmRoutePath();

  if (!isTraceExplorerEnabled) {
    return children;
  }

  const explorerLink = router.link('/traces/explorer', {
    query: {
      comparisonEnabled: query.comparisonEnabled,
      environment: query.environment,
      kuery: query.kuery,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      offset: query.offset,
      refreshInterval: query.refreshInterval,
      refreshPaused: query.refreshPaused,
      query: '',
      type: TraceSearchType.kql,
      waterfallItemId: '',
      traceId: '',
      transactionId: '',
      detailTab: TransactionTab.timeline,
      showCriticalPath: false,
    },
  });

  const topTracesLink = router.link('/traces', {
    query: {
      comparisonEnabled: query.comparisonEnabled,
      environment: query.environment,
      kuery: query.kuery,
      rangeFrom: query.rangeFrom,
      rangeTo: query.rangeTo,
      offset: query.offset,
      refreshInterval: query.refreshInterval,
      refreshPaused: query.refreshPaused,
    },
  });

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTabs size="l">
          <EuiTab href={topTracesLink} isSelected={routePath === '/traces'}>
            {i18n.translate('xpack.apm.traceOverview.topTracesTab', {
              defaultMessage: 'Top traces',
            })}
          </EuiTab>
          <EuiTab
            href={explorerLink}
            append={<TechnicalPreviewBadge icon="beaker" />}
            isSelected={routePath === '/traces/explorer'}
          >
            {i18n.translate('xpack.apm.traceOverview.traceExplorerTab', {
              defaultMessage: 'Explorer',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
