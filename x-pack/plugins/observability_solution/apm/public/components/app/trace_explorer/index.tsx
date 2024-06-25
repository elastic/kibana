/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { TraceSearchQuery, TraceSearchType } from '../../../../common/trace_explorer';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useApmRoutePath } from '../../../hooks/use_apm_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TraceExplorerSamplesFetcherContextProvider } from '../../../hooks/use_trace_explorer_samples';
import { APIClientRequestParamsOf } from '../../../services/rest/create_call_apm_api';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { push } from '../../shared/links/url_helpers';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';
import { TransactionTab } from '../transaction_details/waterfall_with_summary/transaction_tabs';
import { TraceSearchBox } from './trace_search_box';

export function TraceExplorer({ children }: { children: React.ReactElement }) {
  const [searchQuery, setSearchQuery] = useState<TraceSearchQuery>({
    query: '',
    type: TraceSearchType.kql,
  });

  const {
    query,
    query: { rangeFrom, rangeTo, environment, query: queryFromUrlParams, type: typeFromUrlParams },
  } = useApmParams('/traces/explorer');

  const history = useHistory();

  useEffect(() => {
    setSearchQuery({
      query: queryFromUrlParams,
      type: typeFromUrlParams,
    });
  }, [queryFromUrlParams, typeFromUrlParams]);

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const params = useMemo<
    APIClientRequestParamsOf<'GET /internal/apm/traces/find'>['params']
  >(() => {
    return {
      query: {
        start,
        end,
        environment,
        query: queryFromUrlParams,
        type: typeFromUrlParams,
      },
    };
  }, [start, end, environment, queryFromUrlParams, typeFromUrlParams]);

  const router = useApmRouter();

  const routePath = useApmRoutePath();

  return (
    <TraceExplorerSamplesFetcherContextProvider params={params}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={2}>
              <TraceSearchBox
                query={searchQuery}
                error={false}
                loading={false}
                onQueryCommit={() => {
                  push(history, {
                    query: {
                      query: searchQuery.query,
                      type: searchQuery.type,
                    },
                  });
                }}
                onQueryChange={(nextQuery) => {
                  setSearchQuery(nextQuery);
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <ApmDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTabs>
            <EuiTab
              href={router.link('/traces/explorer/waterfall', {
                query: {
                  ...query,
                  traceId: '',
                  transactionId: '',
                  waterfallItemId: '',
                  detailTab: TransactionTab.timeline,
                },
              })}
              isSelected={routePath === '/traces/explorer/waterfall'}
            >
              {i18n.translate('xpack.apm.traceExplorer.waterfallTab', {
                defaultMessage: 'Waterfall',
              })}
            </EuiTab>
            <EuiTab
              href={router.link('/traces/explorer/critical_path', {
                query,
              })}
              isSelected={routePath === '/traces/explorer/critical_path'}
            >
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.apm.traceExplorer.criticalPathTab', {
                    defaultMessage: 'Aggregated critical path',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <TechnicalPreviewBadge
                    icon="beaker"
                    size="s"
                    style={{ verticalAlign: 'middle' }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </TraceExplorerSamplesFetcherContextProvider>
  );
}
