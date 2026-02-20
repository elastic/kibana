/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { orderBy } from 'lodash';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiSwitch,
  EuiIconTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import type { Direction } from '@elastic/eui/src/services/sort/sort_direction';

import { i18n } from '@kbn/i18n';

import { useUiTracker } from '@kbn/observability-shared-plugin/public';

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { FieldStatsPopover } from './context_popover/field_stats_popover';
import { asPercent, asPreciseDecimal } from '../../../../common/utils/formatters';
import type { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';

import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { push } from '../../shared/links/url_helpers';

import { CorrelationsTable } from './correlations_table';
import { FailedTransactionsCorrelationsHelpPopover } from './failed_transactions_correlations_help_popover';
import { getFailedTransactionsCorrelationImpactLabel } from './utils/get_failed_transactions_correlation_impact_label';
import { getOverallHistogram } from './utils/get_overall_histogram';
import { DurationDistributionChart } from '../../shared/charts/duration_distribution_chart';
import { CorrelationsEmptyStatePrompt } from './empty_state_prompt';
import { CrossClusterSearchCompatibilityWarning } from './cross_cluster_search_warning';
import { CorrelationsProgressControls } from './progress_controls';
import type { OnAddFilter } from './context_popover/field_stats_popover';

import { useFailedTransactionsCorrelations } from './use_failed_transactions_correlations';
import { getTransactionDistributionChartData } from './get_transaction_distribution_chart_data';
import { ChartTitleToolTip } from './chart_title_tool_tip';
import { MIN_TAB_TITLE_HEIGHT } from '../../shared/charts/duration_distribution_chart_with_scrubber';
import { TotalDocCountLabel } from '../../shared/charts/duration_distribution_chart/total_doc_count_label';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { OpenInDiscover } from '../../shared/links/discover_links/open_in_discover';

export function FailedTransactionsCorrelations({ onFilter }: { onFilter: () => void }) {
  const { euiTheme } = useEuiTheme();

  const {
    core: { notifications },
  } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const { serviceName } = useApmServiceContext();

  const {
    query: {
      rangeFrom,
      rangeTo,
      kuery,
      environment,
      transactionName,
      transactionType,
      sampleRangeFrom,
      sampleRangeTo,
    },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { progress, response, startFetch, cancelFetch } = useFailedTransactionsCorrelations();

  const { overallHistogram, hasData, status } = getOverallHistogram(response, progress.isRunning);

  const history = useHistory();
  const [showStats, setShowStats] = useLocalStorage(
    'apmFailedTransactionsShowAdvancedStats',
    false
  );

  const toggleShowStats = useCallback(() => {
    setShowStats(!showStats);
  }, [setShowStats, showStats]);

  const onAddFilter = useCallback<OnAddFilter>(
    ({ fieldName, fieldValue, include }) => {
      if (include) {
        push(history, {
          query: {
            kuery: `${fieldName}:"${fieldValue}"`,
          },
        });
        trackApmEvent({ metric: 'correlations_term_include_filter' });
      } else {
        push(history, {
          query: {
            kuery: `not ${fieldName}:"${fieldValue}"`,
          },
        });
        trackApmEvent({ metric: 'correlations_term_exclude_filter' });
      }
      onFilter();
    },
    [onFilter, history, trackApmEvent]
  );

  const failedTransactionsCorrelationsColumns: Array<
    EuiBasicTableColumn<FailedTransactionsCorrelation>
  > = useMemo(() => {
    const percentageColumns: Array<EuiBasicTableColumn<FailedTransactionsCorrelation>> = showStats
      ? [
          {
            width: '100px',
            field: 'pValue',
            name: (
              <>
                {i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
                  {
                    defaultMessage: 'p-value',
                  }
                )}
                &nbsp;
                <EuiIconTip
                  size="s"
                  color="subdued"
                  type="question"
                  className="eui-alignTop"
                  content={i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.pValueDescription',
                    {
                      defaultMessage:
                        'The chance of getting at least this amount of field name and value for failed transactions given its prevalence in successful transactions.',
                    }
                  )}
                />
              </>
            ),

            render: (pValue: number) => pValue.toPrecision(3),
            sortable: true,
          },
          {
            width: '100px',
            field: 'failurePercentage',
            name: (
              <>
                {i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.failurePercentageLabel',
                  {
                    defaultMessage: 'Failure %',
                  }
                )}
                &nbsp;
                <EuiIconTip
                  size="s"
                  color="subdued"
                  type="question"
                  className="eui-alignTop"
                  content={i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.failurePercentageDescription',
                    {
                      defaultMessage: 'Percentage of time the term appear in failed transactions.',
                    }
                  )}
                />
              </>
            ),
            render: (_, { failurePercentage }) => asPercent(failurePercentage, 1),
            sortable: true,
          },
          {
            field: 'successPercentage',
            width: '100px',
            name: (
              <>
                {i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.successPercentageLabel',
                  {
                    defaultMessage: 'Success %',
                  }
                )}
                &nbsp;
                <EuiIconTip
                  size="s"
                  color="subdued"
                  type="question"
                  className="eui-alignTop"
                  content={i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.successPercentageDescription',
                    {
                      defaultMessage:
                        'Percentage of time the term appear in successful transactions.',
                    }
                  )}
                />
              </>
            ),
            render: (_, { successPercentage }) => asPercent(successPercentage, 1),
            sortable: true,
          },
        ]
      : [];
    return [
      {
        width: '116px',
        field: 'normalizedScore',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.scoreLabel',
              {
                defaultMessage: 'Score',
              }
            )}
            &nbsp;
            <EuiIconTip
              size="s"
              color="subdued"
              type="question"
              className="eui-alignTop"
              content={i18n.translate(
                'xpack.apm.correlations.failedTransactions.correlationsTable.scoreTooltip',
                {
                  defaultMessage:
                    'The score [0-1] of an attribute; the greater the score, the more an attribute contributes to failed transactions.',
                }
              )}
            />
          </>
        ),
        render: (_, { normalizedScore }) => {
          return <div>{asPreciseDecimal(normalizedScore, 2)}</div>;
        },
        sortable: true,
      },
      {
        width: '116px',
        field: 'pValue',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.impactLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          </>
        ),
        render: (_, { pValue, isFallbackResult }) => {
          const label = getFailedTransactionsCorrelationImpactLabel(pValue, isFallbackResult);
          return label ? <EuiBadge color={label.color}>{label.impact}</EuiBadge> : null;
        },
        sortable: true,
      },
      {
        field: 'fieldName',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldNameLabel',
          { defaultMessage: 'Field name' }
        ),
        render: (_, { fieldName, fieldValue }) => (
          <>
            {fieldName}
            <FieldStatsPopover
              fieldName={fieldName}
              fieldValue={fieldValue}
              onAddFilter={onAddFilter}
            />
          </>
        ),
        sortable: true,
      },
      {
        field: 'fieldValue',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (_, { fieldValue }) => String(fieldValue).slice(0, 50),
        sortable: true,
      },
      ...percentageColumns,
      {
        width: '100px',
        actions: [
          {
            name: i18n.translate('xpack.apm.correlations.correlationsTable.filterLabel', {
              defaultMessage: 'Filter',
            }),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterDescription',
              { defaultMessage: 'Filter by value' }
            ),
            icon: 'plusInCircle',
            type: 'icon',
            onClick: ({ fieldName, fieldValue }: FailedTransactionsCorrelation) =>
              onAddFilter({
                fieldName,
                fieldValue,
                include: true,
              }),
          },
          {
            name: i18n.translate('xpack.apm.correlations.correlationsTable.excludeLabel', {
              defaultMessage: 'Exclude',
            }),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: ({ fieldName, fieldValue }: FailedTransactionsCorrelation) =>
              onAddFilter({
                fieldName,
                fieldValue,
                include: false,
              }),
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<FailedTransactionsCorrelation>>;
  }, [onAddFilter, showStats]);

  useEffect(() => {
    if (progress.error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.correlations.failedTransactions.errorTitle', {
          defaultMessage: 'An error occurred performing correlations on failed transactions',
        }),
        text: progress.error,
      });
    }
  }, [progress.error, notifications.toasts]);

  const [sortField, setSortField] =
    useState<keyof FailedTransactionsCorrelation>('normalizedScore');
  const [sortDirection, setSortDirection] = useState<Direction>('desc');

  const onTableChange = useCallback(({ sort }: any) => {
    const { field: currentSortField, direction: currentSortDirection } = sort;

    setSortField(currentSortField);
    setSortDirection(currentSortDirection);
  }, []);

  const sorting: EuiTableSortingType<FailedTransactionsCorrelation> = {
    sort: { field: sortField, direction: sortDirection },
  };

  const correlationTerms = useMemo(() => {
    if (
      progress.loaded === 1 &&
      response?.failedTransactionsCorrelations?.length === 0 &&
      response.fallbackResult !== undefined
    ) {
      return [{ ...response.fallbackResult, isFallbackResult: true }];
    }

    return orderBy(
      response.failedTransactionsCorrelations,
      // The smaller the p value the higher the impact
      // So we want to sort by the normalized score here
      // which goes from 0 -> 1
      sortField === 'pValue' ? 'normalizedScore' : sortField,
      sortDirection
    );
  }, [
    response.failedTransactionsCorrelations,
    response.fallbackResult,
    progress.loaded,
    sortField,
    sortDirection,
  ]);

  const [pinnedSignificantTerm, setPinnedSignificantTerm] =
    useState<FailedTransactionsCorrelation | null>(null);
  const [selectedSignificantTerm, setSelectedSignificantTerm] =
    useState<FailedTransactionsCorrelation | null>(null);

  const selectedTerm = useMemo(() => {
    if (!correlationTerms) {
      return;
    } else if (selectedSignificantTerm) {
      return correlationTerms?.find(
        (h) =>
          h.fieldName === selectedSignificantTerm.fieldName &&
          h.fieldValue === selectedSignificantTerm.fieldValue
      );
    } else if (pinnedSignificantTerm) {
      return correlationTerms.find(
        (h) =>
          h.fieldName === pinnedSignificantTerm.fieldName &&
          h.fieldValue === pinnedSignificantTerm.fieldValue
      );
    }
    return correlationTerms[0];
  }, [correlationTerms, pinnedSignificantTerm, selectedSignificantTerm]);

  const showCorrelationsTable = progress.isRunning || correlationTerms.length > 0;

  const showCorrelationsEmptyStatePrompt =
    correlationTerms.length < 1 && (progress.loaded === 1 || !progress.isRunning);

  const transactionDistributionChartData = getTransactionDistributionChartData({
    euiTheme,
    allTransactionsHistogram: overallHistogram,
    failedTransactionsHistogram: response.errorHistogram,
    selectedTerm,
  });

  return (
    <div data-test-subj="apmFailedTransactionsCorrelationsTabContent">
      <EuiFlexGroup style={{ minHeight: MIN_TAB_TITLE_HEIGHT }} alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs" data-test-subj="apmFailedTransactionsCorrelationsTabTitle">
            <h5 data-test-subj="apmFailedTransactionsCorrelationsChartTitle">
              {i18n.translate('xpack.apm.correlations.failedTransactions.panelTitle', {
                defaultMessage: 'Failed transactions latency distribution',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ChartTitleToolTip />
        </EuiFlexItem>

        <EuiFlexItem>
          <TotalDocCountLabel
            eventType={ProcessorEvent.transaction}
            totalDocCount={response.totalDocCount}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <OpenInDiscover
            dataTestSubj="apmFailedCorrelationsViewInDiscoverButton"
            variant="button"
            indexType="traces"
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            queryParams={{
              kuery,
              serviceName,
              environment,
              transactionName,
              transactionType,
              sampleRangeFrom,
              sampleRangeTo,
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <FailedTransactionsCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <DurationDistributionChart
        markerValue={response.percentileThresholdValue ?? 0}
        data={transactionDistributionChartData}
        hasData={hasData}
        status={status}
        eventType={ProcessorEvent.transaction}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiTitle size="xs">
          <span data-test-subj="apmFailedTransactionsCorrelationsTablePanelTitle">
            {i18n.translate('xpack.apm.correlations.failedTransactions.tableTitle', {
              defaultMessage: 'Correlations',
            })}
          </span>
        </EuiTitle>
        <EuiFlexItem
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingLeft: euiTheme.size.s,
          }}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.advancedStatisticsLabel',
              {
                defaultMessage: 'Advanced statistics',
              }
            )}
            checked={showStats}
            onChange={toggleShowStats}
            compressed
          />
          <EuiIconTip
            size="m"
            iconProps={{
              css: { marginLeft: euiTheme.size.xs },
            }}
            content={i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.advancedStatisticsTooltipContent',
              {
                defaultMessage:
                  'Enable additional statistical information for the correlation results.',
              }
            )}
            type="question"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <CorrelationsProgressControls
        progress={progress.loaded}
        isRunning={progress.isRunning}
        onRefresh={startFetch}
        onCancel={cancelFetch}
      />

      {response.ccsWarning && (
        <>
          <EuiSpacer size="m" />
          {/* Failed transactions correlations uses ES aggs that are available since 7.15 */}
          <CrossClusterSearchCompatibilityWarning version="7.15" />
        </>
      )}

      <EuiSpacer size="m" />

      <div data-test-subj="apmCorrelationsTable">
        {showCorrelationsTable && (
          <CorrelationsTable<FailedTransactionsCorrelation>
            columns={failedTransactionsCorrelationsColumns}
            rowHeader="normalizedScore"
            significantTerms={correlationTerms}
            status={progress.isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS}
            setPinnedSignificantTerm={setPinnedSignificantTerm}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            selectedTerm={selectedTerm}
            onTableChange={onTableChange}
            sorting={sorting}
          />
        )}
        {showCorrelationsEmptyStatePrompt && <CorrelationsEmptyStatePrompt />}
      </div>
    </div>
  );
}
