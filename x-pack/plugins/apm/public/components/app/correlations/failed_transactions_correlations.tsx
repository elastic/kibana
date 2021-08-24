/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiLink,
  EuiTitle,
  EuiBetaBadge,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { orderBy } from 'lodash';
import type { EuiTableSortingType } from '@elastic/eui/src/components/basic_table/table_types';
import type { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { CorrelationsTable } from './correlations_table';
import { enableInspectEsQueries } from '../../../../../observability/public';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { FailedTransactionsCorrelationsHelpPopover } from './failed_transactions_correlations_help_popover';
import { ImpactBar } from '../../shared/ImpactBar';
import { isErrorMessage } from './utils/is_error_message';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { getFailedTransactionsCorrelationImpactLabel } from './utils/get_failed_transactions_correlation_impact_label';
import { createHref, push } from '../../shared/Links/url_helpers';
import { useUiTracker } from '../../../../../observability/public';
import { useFailedTransactionsCorrelationsFetcher } from '../../../hooks/use_failed_transactions_correlations_fetcher';
import { useApmParams } from '../../../hooks/use_apm_params';
import { CorrelationsLog } from './correlations_log';
import { CorrelationsEmptyStatePrompt } from './empty_state_prompt';
import { CrossClusterSearchCompatibilityWarning } from './cross_cluster_search_warning';
import { CorrelationsProgressControls } from './progress_controls';
import type { SearchServiceParams } from '../../../../common/search_strategies/correlations/types';
import type { FailedTransactionsCorrelationValue } from '../../../../common/search_strategies/failure_correlations/types';
import { Summary } from '../../shared/Summary';
import { asPercent } from '../../../../common/utils/formatters';

export function FailedTransactionsCorrelations({
  onFilter,
}: {
  onFilter: () => void;
}) {
  const {
    core: { notifications, uiSettings },
  } = useApmPluginContext();
  const trackApmEvent = useUiTracker({ app: 'apm' });

  const { serviceName, transactionType } = useApmServiceContext();

  const {
    query: { kuery, environment },
  } = useApmParams('/services/:serviceName');

  const { urlParams } = useUrlParams();
  const { transactionName, start, end } = urlParams;

  const inspectEnabled = uiSettings.get<boolean>(enableInspectEsQueries);

  const searchServicePrams: SearchServiceParams = {
    environment,
    kuery,
    serviceName,
    transactionName,
    transactionType,
    start,
    end,
  };

  const result = useFailedTransactionsCorrelationsFetcher();

  const {
    ccsWarning,
    log,
    error,
    isRunning,
    progress,
    startFetch,
    cancelFetch,
  } = result;

  const startFetchHandler = useCallback(() => {
    startFetch(searchServicePrams);
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

  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<FailedTransactionsCorrelationValue | null>(null);

  const selectedTerm = useMemo(() => {
    if (selectedSignificantTerm) return selectedSignificantTerm;
    return result?.values &&
      Array.isArray(result.values) &&
      result.values.length > 0
      ? result?.values[0]
      : undefined;
  }, [selectedSignificantTerm, result]);

  const history = useHistory();

  const failedTransactionsCorrelationsColumns: Array<
    EuiBasicTableColumn<FailedTransactionsCorrelationValue>
  > = useMemo(() => {
    const percentageColumns: Array<
      EuiBasicTableColumn<FailedTransactionsCorrelationValue>
    > = inspectEnabled
      ? [
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
            render: (failurePercentage: number) =>
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

            render: (successPercentage: number) =>
              asPercent(successPercentage, 1),
            sortable: true,
          },
        ]
      : [];
    return [
      {
        width: '80px',
        field: 'normalizedScore',
        name: (
          <>
            {i18n.translate(
              'xpack.apm.correlations.failedTransactions.correlationsTable.pValueLabel',
              {
                defaultMessage: 'Score',
              }
            )}
          </>
        ),
        render: (normalizedScore: number) => {
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
        render: (pValue: number) => {
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
        sortable: true,
      },
      {
        field: 'key',
        name: i18n.translate(
          'xpack.apm.correlations.failedTransactions.correlationsTable.fieldValueLabel',
          { defaultMessage: 'Field value' }
        ),
        render: (fieldValue: string) => String(fieldValue).slice(0, 50),
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
            onClick: (term: FailedTransactionsCorrelationValue) => {
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
              'xpack.apm.correlations.correlationsTable.excludeLabel',
              { defaultMessage: 'Exclude' }
            ),
            description: i18n.translate(
              'xpack.apm.correlations.correlationsTable.excludeDescription',
              { defaultMessage: 'Filter out value' }
            ),
            icon: 'minusInCircle',
            type: 'icon',
            onClick: (term: FailedTransactionsCorrelationValue) => {
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
          'xpack.apm.correlations.correlationsTable.actionsLabel',
          { defaultMessage: 'Filter' }
        ),
        render: (_: unknown, term: FailedTransactionsCorrelationValue) => {
          return (
            <>
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `${term.fieldName}:"${term.fieldValue}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithPlus" />
              </EuiLink>
              &nbsp;/&nbsp;
              <EuiLink
                href={createHref(history, {
                  query: {
                    kuery: `not ${term.fieldName}:"${term.fieldValue}"`,
                  },
                })}
              >
                <EuiIcon type="magnifyWithMinus" />
              </EuiLink>
            </>
          );
        },
      },
    ] as Array<EuiBasicTableColumn<FailedTransactionsCorrelationValue>>;
  }, [history, onFilter, trackApmEvent, inspectEnabled]);

  useEffect(() => {
    if (isErrorMessage(error)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.correlations.failedTransactions.errorTitle',
          {
            defaultMessage:
              'An error occurred performing correlations on failed transactions',
          }
        ),
        text: error.toString(),
      });
    }
  }, [error, notifications.toasts]);

  const [sortField, setSortField] = useState<
    keyof FailedTransactionsCorrelationValue
  >('normalizedScore');
  const [sortDirection, setSortDirection] = useState<Direction>('desc');

  const onTableChange = useCallback(({ sort }) => {
    const { field: currentSortField, direction: currentSortDirection } = sort;

    setSortField(currentSortField);
    setSortDirection(currentSortDirection);
  }, []);

  const { sorting, correlationTerms } = useMemo(() => {
    if (!Array.isArray(result.values)) {
      return { correlationTerms: [], sorting: undefined };
    }
    const orderedTerms = orderBy(
      result.values,
      // The smaller the p value the higher the impact
      // So we want to sort by the normalized score here
      // which goes from 0 -> 1
      sortField === 'pValue' ? 'normalizedScore' : sortField,
      sortDirection
    );
    return {
      correlationTerms: orderedTerms,
      sorting: {
        sort: {
          field: sortField,
          direction: sortDirection,
        },
      } as EuiTableSortingType<FailedTransactionsCorrelationValue>,
    };
  }, [result?.values, sortField, sortDirection]);

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
                    defaultMessage: 'Failed transactions',
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

      <EuiSpacer size="s" />

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
          <CrossClusterSearchCompatibilityWarning version="7.15" />
        </>
      )}

      {inspectEnabled &&
      selectedTerm?.pValue != null &&
      (isRunning || correlationTerms.length > 0) ? (
        <>
          <EuiSpacer size="m" />
          <Summary
            items={[
              <EuiBadge color="hollow">
                {`${selectedTerm.fieldName}: ${selectedTerm.key}`}
              </EuiBadge>,
              <>{`p-value: ${selectedTerm.pValue.toPrecision(3)}`}</>,
            ]}
          />
        </>
      ) : null}

      <EuiSpacer size="m" />

      <div data-test-subj="apmCorrelationsTable">
        {(isRunning || correlationTerms.length > 0) && (
          <CorrelationsTable<FailedTransactionsCorrelationValue>
            columns={failedTransactionsCorrelationsColumns}
            significantTerms={correlationTerms}
            status={isRunning ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            selectedTerm={selectedTerm}
            onTableChange={onTableChange}
            sorting={sorting}
          />
        )}
        {correlationTerms.length < 1 && (progress === 1 || !isRunning) && (
          <CorrelationsEmptyStatePrompt />
        )}
      </div>
      {inspectEnabled && <CorrelationsLog logMessages={log} />}
    </div>
  );
}
