/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TraceSearchType } from '../../../../common/trace_explorer';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useTraceExplorerEnabledSetting } from '../../../hooks/use_trace_explorer_enabled_setting';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';
import { Breadcrumb } from '../breadcrumb';
import { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';

type Tab = Required<
  Required<React.ComponentProps<typeof ApmMainTemplate>>['pageHeader']
>['tabs'][number];

export function TraceOverview({ children }: { children: React.ReactElement }) {
  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const router = useApmRouter();

  const { query } = useApmParams('/traces');

  const routePath = useApmRoutePath();

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

  const title = i18n.translate('xpack.apm.views.traceOverview.title', {
    defaultMessage: 'Traces',
  });

  const explorerLink = router.link('/traces/explorer/waterfall', {
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

  const tabs: Tab[] = isTraceExplorerEnabled
    ? [
        {
          href: topTracesLink,
          label: i18n.translate('xpack.apm.traceOverview.topTracesTab', {
            defaultMessage: 'Top traces',
          }),
          isSelected: routePath === '/traces',
        },
        {
          href: explorerLink,
          label: (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.apm.traceOverview.traceExplorerTab', {
                  defaultMessage: 'Explorer',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TechnicalPreviewBadge icon="beaker" style={{ verticalAlign: 'middle' }} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          isSelected: routePath.startsWith('/traces/explorer'),
        },
      ]
    : [];

  return (
    <Breadcrumb href="/traces" title={title} omitOnServerless>
      <ApmMainTemplate
        pageTitle={title}
        pageSectionProps={{
          contentProps: {
            style: {
              display: 'flex',
              flexGrow: 1,
            },
          },
        }}
        pageHeader={{
          tabs,
        }}
      >
        {children}
      </ApmMainTemplate>
    </Breadcrumb>
  );
}
