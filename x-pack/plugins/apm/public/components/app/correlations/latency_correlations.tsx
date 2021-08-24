/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiIcon,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { orderBy } from 'lodash';
import { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTransactionLatencyCorrelationsFetcher } from '../../../hooks/use_transaction_latency_correlations_fetcher';
import { TransactionDistributionChart } from '../../shared/charts/transaction_distribution_chart';
import { CorrelationsTable } from './correlations_table';
import { push } from '../../shared/Links/url_helpers';
import {
  enableInspectEsQueries,
  useUiTracker,
} from '../../../../../observability/public';
import { asPreciseDecimal } from '../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { LatencyCorrelationsHelpPopover } from './latency_correlations_help_popover';
import { useApmParams } from '../../../hooks/use_apm_params';
import { isErrorMessage } from './utils/is_error_message';
import { CorrelationsLog } from './correlations_log';
import { CorrelationsEmptyStatePrompt } from './empty_state_prompt';
import { CrossClusterSearchCompatibilityWarning } from './cross_cluster_search_warning';
import { CorrelationsProgressControls } from './progress_controls';

const DEFAULT_PERCENTILE_THRESHOLD = 95;

interface MlCorrelationsTerms {
  correlation: number;
  ksTest: number;
  fieldName: string;
  fieldValue: string;
  duplicatedFields?: string[];
}

export function LatencyCorrelations({ onFilter }: { onFilter: () => void }) {
  const {
    core: { notifications, uiSettings },
  } = useApmPluginContext();

  const { serviceName, transactionType } = useApmServiceContext();

  const {
    query: { kuery, environment },
  } = useApmParams('/services/:serviceName');

  const { urlParams } = useUrlParams();

  const { transactionName, start, end } = urlParams;

  const displayLog = uiSettings.get<boolean>(enableInspectEsQueries);

  const {
    ccsWarning,
    log,
    error,
    histograms,
    percentileThresholdValue,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
    overallHistogram,
  } = useTransactionLatencyCorrelationsFetcher();

  const startFetchHandler = useCallback(() => {
    startFetch({
      environment,
      kuery,
      serviceName,
      transactionName,
      transactionType,
      start,
      end,
      percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment, serviceName, kuery, start, end]);

  // start fetching on load
  // we want this effect to execute exactly once after the component mounts
  useEffect(() => {
    if (isRunning) {
      cancelFetch();
    }

    startFetchHandler();

    return () => {
      // cancel any running async partial request when unmounting the component
      // we want this effect to execute exactly once after the component mounts
      cancelFetch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFetchHandler]);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.errorTitle',
          {
            defaultMessage: 'An error occurred fetching correlations',
          }
        ),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<MlCorrelationsTerms | null>(null);

  const selectedHistogram = useMemo(() => {
    let selected = histograms.length > 0 ? histograms[0] : undefined;

    if (histograms.length > 0 && selectedSignificantTerm !== null) {
      selected = histograms.find(
        (h) =>
          h.field === selectedSignificantTerm.fieldName &&
          h.value === selectedSignificantTerm.fieldValue
      );
    }
    return selected;
  }, [histograms, selectedSignificantTerm]);

  const history = useHistory();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const mlCorrelationColumns: Array<
    EuiBasicTableColumn<MlCorrelationsTerms>
  > = useMemo(
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
        render: (correlation: number) => {
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
        sortable: true,
      },
      {
        field: 'fieldValue',
        name: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (fieldValue: string) => String(fieldValue).slice(0, 50),
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
            onClick: (term: MlCorrelationsTerms) => {
              push(history, {
                query: {
                  kuery: `${term.fieldName}:"${term.fieldValue}"`,
                },
              });
              onFilter();
              trackApmEvent({ metric: 'correlations_term_include_filter' });
            },
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
            onClick: (term: MlCorrelationsTerms) => {
              push(history, {
                query: {
                  kuery: `not ${term.fieldName}:"${term.fieldValue}"`,
                },
              });
              onFilter();
              trackApmEvent({ metric: 'correlations_term_exclude_filter' });
            },
          },
        ],
        name: i18n.translate(
          'xpack.apm.correlations.latencyCorrelations.correlationsTable.actionsLabel',
          { defaultMessage: 'Filter' }
        ),
      },
    ],
    [history, onFilter, trackApmEvent]
  );

  const [sortField, setSortField] = useState<keyof MlCorrelationsTerms>(
    'correlation'
  );
  const [sortDirection, setSortDirection] = useState<Direction>('desc');

  const onTableChange = useCallback(({ sort }) => {
    const { field: currentSortField, direction: currentSortDirection } = sort;

    setSortField(currentSortField);
    setSortDirection(currentSortDirection);
  }, []);

  const { histogramTerms, sorting } = useMemo(() => {
    if (!Array.isArray(histograms)) {
      return { histogramTerms: [], sorting: undefined };
    }
    const orderedTerms = orderBy(
      histograms.map((d) => {
        return {
          fieldName: d.field,
          fieldValue: d.value,
          ksTest: d.ksTest,
          correlation: d.correlation,
          duplicatedFields: d.duplicatedFields,
        };
      }),
      sortField,
      sortDirection
    );

    return {
      histogramTerms: orderedTerms,
      sorting: {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      } as EuiTableSortingType<MlCorrelationsTerms>,
    };
  }, [histograms, sortField, sortDirection]);

  return (
    <div data-test-subj="apmLatencyCorrelationsTabContent">
      <EuiFlexGroup>
        <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        <EuiFlexItem grow={false}>
          <LatencyCorrelationsHelpPopover />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionDistributionChart
        markerPercentile={DEFAULT_PERCENTILE_THRESHOLD}
        markerValue={percentileThresholdValue ?? 0}
        {...selectedHistogram}
        overallHistogram={overallHistogram}
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
        progress={progress}
        isRunning={isRunning}
        onRefresh={startFetchHandler}
        onCancel={cancelFetch}
      />

      {ccsWarning && (
        <>
          <EuiSpacer size="m" />
          <CrossClusterSearchCompatibilityWarning version="7.14" />
        </>
      )}

      <EuiSpacer size="m" />

      <div data-test-subj="apmCorrelationsTable">
        {(isRunning || histogramTerms.length > 0) && (
          <CorrelationsTable<MlCorrelationsTerms>
            columns={mlCorrelationColumns}
            significantTerms={histogramTerms}
            status={isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            selectedTerm={
              selectedHistogram !== undefined
                ? {
                    fieldName: selectedHistogram.field,
                    fieldValue: selectedHistogram.value,
                  }
                : undefined
            }
            onTableChange={onTableChange}
            sorting={sorting}
          />
        )}
        {histogramTerms.length < 1 && (progress === 1 || !isRunning) && (
          <CorrelationsEmptyStatePrompt />
        )}
      </div>
      {displayLog && <CorrelationsLog logMessages={log} />}
    </div>
  );
}
