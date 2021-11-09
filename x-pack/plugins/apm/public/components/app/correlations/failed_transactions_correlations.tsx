/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { orderBy } from 'lodash';

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiTitle,
  EuiBetaBadge,
  EuiBadge,
  EuiText,
  EuiToolTip,
  EuiSwitch,
  EuiIconTip,
} from '@elastic/eui';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import type { Direction } from '@elastic/eui/src/services/sort/sort_direction';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useUiTracker } from '../../../../../observability/public';

import { asPercent } from '../../../../common/utils/formatters';
import { FailedTransactionsCorrelation } from '../../../../common/correlations/failed_transactions_correlations/types';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../common/correlations/constants';
import { FieldStats } from '../../../../common/correlations/field_stats_types';

import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';

import { ImpactBar } from '../../shared/ImpactBar';
import { push } from '../../shared/Links/url_helpers';

import { CorrelationsTable } from './correlations_table';
import { FailedTransactionsCorrelationsHelpPopover } from './failed_transactions_correlations_help_popover';
import { getFailedTransactionsCorrelationImpactLabel } from './utils/get_failed_transactions_correlation_impact_label';
import { getOverallHistogram } from './utils/get_overall_histogram';
import {
  TransactionDistributionChart,
  TransactionDistributionChartData,
} from '../../shared/charts/transaction_distribution_chart';
import { CorrelationsEmptyStatePrompt } from './empty_state_prompt';
import { CrossClusterSearchCompatibilityWarning } from './cross_cluster_search_warning';
import { CorrelationsProgressControls } from './progress_controls';
import { useTransactionColors } from './use_transaction_colors';
import { CorrelationsContextPopover } from './context_popover';
import { OnAddFilter } from './context_popover/top_values';

import { useFailedTransactionsCorrelations } from './use_failed_transactions_correlations';

export function FailedTransactionsCorrelations({
  onFilter,
}: {
  onFilter: () => void;
}) {
  const euiTheme = useTheme();
  const transactionColors = useTransactionColors();

  const {
    core: { notifications },
  } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const { progress, response, startFetch, cancelFetch } =
    useFailedTransactionsCorrelations();

  const fieldStats: Record<string, FieldStats> | undefined = useMemo(() => {
    return response.fieldStats?.reduce((obj, field) => {
      obj[field.fieldName] = field;
      return obj;
    }, {} as Record<string, FieldStats>);
  }, [response?.fieldStats]);

  const { overallHistogram, hasData, status } = getOverallHistogram(
    response,
    progress.isRunning
  );

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
    const percentageColumns: Array<
      EuiBasicTableColumn<FailedTransactionsCorrelation>
    > = showStats
      ? [
          {
            width: '100px',
            field: 'pValue',
            name: (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.pValueDescription',
                  {
                    defaultMessage:
                      'The chance of getting at least this amount of field name and value for failed transactions given its prevalence in successful transactions.',
                  }
                )}
              >
                <>
                  {i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
                    {
                      defaultMessage: 'p-value',
                    }
                  )}
                  <EuiIcon
                    size="s"
                    color="subdued"
                    type="questionInCircle"
                    className="eui-alignTop"
                  />
                </>
              </EuiToolTip>
            ),

            render: (pValue: number) => pValue.toPrecision(3),
            sortable: true,
          },
          {
            width: '100px',
            field: 'failurePercentage',
            name: (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.failurePercentageDescription',
                  {
                    defaultMessage:
                      'Percentage of time the term appear in failed transactions.',
                  }
                )}
              >
                <>
                  {i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.failurePercentageLabel',
                    {
                      defaultMessage: 'Failure %',
                    }
                  )}
                  <EuiIcon
                    size="s"
                    color="subdued"
                    type="questionInCircle"
                    className="eui-alignTop"
                  />
                </>
              </EuiToolTip>
            ),
            render: (_, { failurePercentage }) =>
              asPercent(failurePercentage, 1),
            sortable: true,
          },
          {
            field: 'successPercentage',
            width: '100px',
            name: (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.correlations.failedTransactions.correlationsTable.successPercentageDescription',
                  {
                    defaultMessage:
                      'Percentage of time the term appear in successful transactions.',
                  }
                )}
              >
                <>
                  {i18n.translate(
                    'xpack.apm.correlations.failedTransactions.correlationsTable.successPercentageLabel',
                    {
                      defaultMessage: 'Success %',
                    }
                  )}
                  <EuiIcon
                    size="s"
                    color="subdued"
                    type="questionInCircle"
                    className="eui-alignTop"
                  />
                </>
              </EuiToolTip>
            ),

            render: (_, { successPercentage }) =>
              asPercent(successPercentage, 1),
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
          </>
        ),
        render: (_, { normalizedScore }) => {
          return (
            <>
              <ImpactBar size="m" value={normalizedScore * 100} />
            </>
          );
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
        render: (_, { pValue }) => {
          const label = getFailedTransactionsCorrelationImpactLabel(pValue);
          return label ? (
            <EuiBadge color={label.color}>{label.impact}</EuiBadge>
          ) : null;
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
            <CorrelationsContextPopover
              fieldName={fieldName}
              fieldValue={fieldValue}
              topValueStats={fieldStats ? fieldStats[fieldName] : undefined}
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
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterLabel',
              { defaultMessage: 'Filter' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.filterDescription',
              { defaultMessage: 'Filter by value' }
            ),
            icon: 'plusInCircle',
            type: 'icon',
            onClick: ({
              fieldName,
              fieldValue,
            }: FailedTransactionsCorrelation) =>
              onAddFilter({
                fieldName,
                fieldValue,
                include: true,
              }),
          },
          {
            name: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeLabel',
              { defaultMessage: 'Exclude' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: ({
              fieldName,
              fieldValue,
            }: FailedTransactionsCorrelation) =>
              onAddFilter({
                fieldName,
                fieldValue,
                include: false,
              }),
          },
        ],
      },
    ] as Array<EuiBasicTableColumn<FailedTransactionsCorrelation>>;
  }, [fieldStats, onAddFilter, showStats]);

  useEffect(() => {
    if (progress.error) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.failedTransactions.errorTitle',
          {
            defaultMessage:
              'An error occurred performing correlations on failed transactions',
          }
        ),
        text: progress.error,
      });
    }
  }, [progress.error, notifications.toasts]);

  const [sortField, setSortField] =
    useState<keyof FailedTransactionsCorrelation>('normalizedScore');
  const [sortDirection, setSortDirection] = useState<Direction>('desc');

  const onTableChange = useCallback(({ sort }) => {
    const { field: currentSortField, direction: currentSortDirection } = sort;

    setSortField(currentSortField);
    setSortDirection(currentSortDirection);
  }, []);

  const sorting: EuiTableSortingType<FailedTransactionsCorrelation> = {
    sort: { field: sortField, direction: sortDirection },
  };

  const correlationTerms = useMemo(
    () =>
      orderBy(
        response.failedTransactionsCorrelations,
        // The smaller the p value the higher the impact
        // So we want to sort by the normalized score here
        // which goes from 0 -> 1
        sortField === 'pValue' ? 'normalizedScore' : sortField,
        sortDirection
      ),
    [response.failedTransactionsCorrelations, sortField, sortDirection]
  );

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

  const showCorrelationsTable =
    progress.isRunning || correlationTerms.length > 0;

  const showCorrelationsEmptyStatePrompt =
    correlationTerms.length < 1 &&
    (progress.loaded === 1 || !progress.isRunning);

  const transactionDistributionChartData: TransactionDistributionChartData[] =
    [];

  if (Array.isArray(overallHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'xpack.apm.transactionDistribution.chart.allTransactionsLabel',
        { defaultMessage: 'All transactions' }
      ),
      histogram: overallHistogram,
    });
  }

  if (Array.isArray(response.errorHistogram)) {
    transactionDistributionChartData.push({
      id: i18n.translate(
        'xpack.apm.transactionDistribution.chart.failedTransactionsLabel',
        { defaultMessage: 'Failed transactions' }
      ),
      histogram: response.errorHistogram,
    });
  }

  if (selectedTerm && Array.isArray(selectedTerm.histogram)) {
    transactionDistributionChartData.push({
      id: `${selectedTerm.fieldName}:${selectedTerm.fieldValue}`,
      histogram: selectedTerm.histogram,
    });
  }

  return (
    <div data-test-subj="apmFailedTransactionsCorrelationsTabContent">
      <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle
              size="xs"
              data-test-subj="apmFailedTransactionsCorrelationsTabTitle"
            >
              <h5 data-test-subj="apmFailedTransactionsCorrelationsChartTitle">
                {i18n.translate(
                  'xpack.apm.correlations.failedTransactions.panelTitle',
                  {
                    defaultMessage: 'Failed transactions latency distribution',
                  }
                )}
              </h5>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaLabel',
                {
                  defaultMessage: 'Beta',
                }
              )}
              title={i18n.translate(
                'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaTitle',
                {
                  defaultMessage: 'Failed transaction correlations',
                }
              )}
              tooltipContent={i18n.translate(
                'xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsBetaDescription',
                {
                  defaultMessage:
                    'Failed transaction correlations is not GA. Please help us by reporting any bugs.',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexItem grow={false}>
          <FailedTransactionsCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexItem>

      {selectedTerm && (
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsChartDescription"
            defaultMessage="Log-log plot for latency (x) by transactions (y) with overlapping bands for {br}{allTransactions}, {failedTransactions} and {focusTransaction}."
            values={{
              br: <br />,
              allTransactions: (
                <span style={{ color: transactionColors.ALL_TRANSACTIONS }}>
                  <FormattedMessage
                    id="xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsChartAllTransactions"
                    defaultMessage="all transactions"
                  />
                </span>
              ),
              failedTransactions: (
                <span
                  style={{ color: transactionColors.ALL_FAILED_TRANSACTIONS }}
                >
                  <FormattedMessage
                    id="xpack.apm.transactionDetails.tabs.failedTransactionsCorrelationsChartFailedTransactions"
                    defaultMessage="failed transactions"
                  />
                </span>
              ),
              focusTransaction: (
                <span style={{ color: transactionColors.FOCUS_TRANSACTION }}>
                  {selectedTerm?.fieldName}:{selectedTerm?.fieldValue}
                </span>
              ),
            }}
          />
        </EuiText>
      )}

      <EuiSpacer size="s" />

      <TransactionDistributionChart
        markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
        markerValue={response.percentileThresholdValue ?? 0}
        data={transactionDistributionChartData}
        hasData={hasData}
        palette={[
          transactionColors.ALL_TRANSACTIONS,
          transactionColors.ALL_FAILED_TRANSACTIONS,
          transactionColors.FOCUS_TRANSACTION,
        ]}
        status={status}
      />

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiTitle size="xs">
          <span data-test-subj="apmFailedTransactionsCorrelationsTablePanelTitle">
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.tableTitle',
              {
                defaultMessage: 'Correlations',
              }
            )}
          </span>
        </EuiTitle>
        <EuiFlexItem
          style={{
            display: 'flex',
            flexDirection: 'row',
            paddingLeft: euiTheme.eui.paddingSizes.s,
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
              style: { marginLeft: euiTheme.eui.paddingSizes.xs },
            }}
            content={i18n.translate(
              'xpack.apm.correlations.latencyCorrelations.advancedStatisticsTooltipContent',
              {
                defaultMessage:
                  'Enable additional statistical information for the correlation results.',
              }
            )}
            type="questionInCircle"
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
            significantTerms={correlationTerms}
            status={
              progress.isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS
            }
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
