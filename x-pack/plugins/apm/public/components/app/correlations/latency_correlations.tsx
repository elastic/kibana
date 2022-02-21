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
  EuiIcon,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';

import { i18n } from '@kbn/i18n';

import { useUiTracker } from '../../../../../observability/public';

import { asPreciseDecimal } from '../../../../common/utils/formatters';
import { LatencyCorrelation } from '../../../../common/correlations/latency_correlations/types';
import { FieldStats } from '../../../../common/correlations/field_stats_types';

import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

import { TransactionDistributionChart } from '../../shared/charts/transaction_distribution_chart';
import { push } from '../../shared/links/url_helpers';

import { CorrelationsTable } from './correlations_table';
import { LatencyCorrelationsHelpPopover } from './latency_correlations_help_popover';
import { getOverallHistogram } from './utils/get_overall_histogram';
import { CorrelationsEmptyStatePrompt } from './empty_state_prompt';
import { CrossClusterSearchCompatibilityWarning } from './cross_cluster_search_warning';
import { CorrelationsProgressControls } from './progress_controls';
import { CorrelationsContextPopover } from './context_popover';
import { OnAddFilter } from './context_popover/top_values';
import { useLatencyCorrelations } from './use_latency_correlations';
import { getTransactionDistributionChartData } from './get_transaction_distribution_chart_data';
import { useTheme } from '../../../hooks/use_theme';
import { ChartTitleToolTip } from './chart_title_tool_tip';
import { MIN_TAB_TITLE_HEIGHT } from '../transaction_details/distribution';

export function LatencyCorrelations({ onFilter }: { onFilter: () => void }) {
  const {
    core: { notifications },
  } = useApmPluginContext();

  const euiTheme = useTheme();

  const { progress, response, startFetch, cancelFetch } =
    useLatencyCorrelations();
  const { overallHistogram, hasData, status } = getOverallHistogram(
    response,
    progress.isRunning
  );

  const fieldStats: Record<string, FieldStats> | undefined = useMemo(() => {
    return response.fieldStats?.reduce((obj, field) => {
      obj[field.fieldName] = field;
      return obj;
    }, {} as Record<string, FieldStats>);
  }, [response?.fieldStats]);

  useEffect(() => {
    if (progress.error) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.errorTitle',
          {
            defaultMessage: 'An error occurred fetching correlations',
          }
        ),
        text: progress.error,
      });
    }
  }, [progress.error, notifications.toasts]);

  const [pinnedSignificantTerm, setPinnedSignificantTerm] =
    useState<LatencyCorrelation | null>(null);
  const [selectedSignificantTerm, setSelectedSignificantTerm] =
    useState<LatencyCorrelation | null>(null);

  const history = useHistory();
  const trackApmEvent = useUiTracker({ app: 'apm' });

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

  const mlCorrelationColumns: Array<EuiBasicTableColumn<LatencyCorrelation>> =
    useMemo(
      () => [
        {
          width: '116px',
          field: 'correlation',
          name: (
            <EuiToolTip
              content={i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.correlationColumnDescription',
                {
                  defaultMessage:
                    'The correlation score [0-1] of an attribute; the greater the score, the more an attribute increases latency.',
                }
              )}
            >
              <>
                {i18n.translate(
                  'xpack.apm.correlations.latencyCorrelations.correlationsTable.correlationLabel',
                  {
                    defaultMessage: 'Correlation',
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
          render: (_, { correlation }) => {
            return <div>{asPreciseDecimal(correlation, 2)}</div>;
          },
          sortable: true,
        },
        {
          field: 'fieldName',
          name: i18n.translate(
            'xpack.apm.correlations.latencyCorrelations.correlationsTable.fieldNameLabel',
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
            'xpack.apm.correlations.latencyCorrelations.correlationsTable.fieldValueLabel',
            { defaultMessage: 'Field value' }
          ),
          render: (_, { fieldValue }) => String(fieldValue).slice(0, 50),
          sortable: true,
        },
        {
          width: '100px',
          actions: [
            {
              name: i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.filterLabel',
                { defaultMessage: 'Filter' }
              ),
              description: i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.filterDescription',
                { defaultMessage: 'Filter by value' }
              ),
              icon: 'plusInCircle',
              type: 'icon',
              onClick: ({ fieldName, fieldValue }: LatencyCorrelation) =>
                onAddFilter({
                  fieldName,
                  fieldValue,
                  include: true,
                }),
            },
            {
              name: i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.excludeLabel',
                { defaultMessage: 'Exclude' }
              ),
              description: i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.correlationsTable.excludeDescription',
                { defaultMessage: 'Filter out value' }
              ),
              icon: 'minusInCircle',
              type: 'icon',
              onClick: ({ fieldName, fieldValue }: LatencyCorrelation) =>
                onAddFilter({
                  fieldName,
                  fieldValue,
                  include: false,
                }),
            },
          ],
          name: i18n.translate(
            'xpack.apm.correlations.latencyCorrelations.correlationsTable.actionsLabel',
            { defaultMessage: 'Filter' }
          ),
        },
      ],
      [fieldStats, onAddFilter]
    );

  const [sortField, setSortField] =
    useState<keyof LatencyCorrelation>('correlation');
  const [sortDirection, setSortDirection] = useState<Direction>('desc');

  const onTableChange = useCallback(({ sort }) => {
    const { field: currentSortField, direction: currentSortDirection } = sort;

    setSortField(currentSortField);
    setSortDirection(currentSortDirection);
  }, []);

  const sorting: EuiTableSortingType<LatencyCorrelation> = {
    sort: { field: sortField, direction: sortDirection },
  };

  const histogramTerms = useMemo(
    () => orderBy(response.latencyCorrelations ?? [], sortField, sortDirection),
    [response.latencyCorrelations, sortField, sortDirection]
  );

  const selectedHistogram = useMemo(() => {
    if (!histogramTerms) {
      return;
    } else if (selectedSignificantTerm) {
      return histogramTerms?.find(
        (h) =>
          h.fieldName === selectedSignificantTerm.fieldName &&
          h.fieldValue === selectedSignificantTerm.fieldValue
      );
    } else if (pinnedSignificantTerm) {
      return histogramTerms.find(
        (h) =>
          h.fieldName === pinnedSignificantTerm.fieldName &&
          h.fieldValue === pinnedSignificantTerm.fieldValue
      );
    }
    return histogramTerms[0];
  }, [histogramTerms, pinnedSignificantTerm, selectedSignificantTerm]);

  const showCorrelationsTable = progress.isRunning || histogramTerms.length > 0;
  const showCorrelationsEmptyStatePrompt =
    histogramTerms.length < 1 && (progress.loaded === 1 || !progress.isRunning);

  const transactionDistributionChartData = getTransactionDistributionChartData({
    euiTheme,
    allTransactionsHistogram: overallHistogram,
    selectedTerm: selectedHistogram,
  });

  return (
    <div data-test-subj="apmLatencyCorrelationsTabContent">
      <EuiFlexGroup
        style={{ minHeight: MIN_TAB_TITLE_HEIGHT }}
        alignItems="center"
        gutterSize="s"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5 data-test-subj="apmCorrelationsLatencyCorrelationsChartTitle">
              {i18n.translate(
                'xpack.apm.correlations.latencyCorrelations.panelTitle',
                {
                  defaultMessage: 'Latency distribution',
                }
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem>
          <ChartTitleToolTip />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <LatencyCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionDistributionChart
        markerValue={response.percentileThresholdValue ?? 0}
        data={transactionDistributionChartData}
        hasData={hasData}
        status={status}
      />

      <EuiSpacer size="s" />

      <EuiTitle size="xs">
        <h5 data-test-subj="apmCorrelationsLatencyCorrelationsTablePanelTitle">
          {i18n.translate(
            'xpack.apm.correlations.latencyCorrelations.tableTitle',
            {
              defaultMessage: 'Correlations',
            }
          )}
        </h5>
      </EuiTitle>

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
          {/* Latency correlations uses ES aggs that are available since 7.14 */}
          <CrossClusterSearchCompatibilityWarning version="7.14" />
        </>
      )}

      <EuiSpacer size="m" />

      <div data-test-subj="apmCorrelationsTable">
        {showCorrelationsTable && (
          <CorrelationsTable<LatencyCorrelation>
            columns={mlCorrelationColumns}
            significantTerms={histogramTerms}
            status={
              progress.isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS
            }
            setPinnedSignificantTerm={setPinnedSignificantTerm}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            selectedTerm={selectedHistogram}
            onTableChange={onTableChange}
            sorting={sorting}
          />
        )}
        {showCorrelationsEmptyStatePrompt && <CorrelationsEmptyStatePrompt />}
      </div>
    </div>
  );
}
