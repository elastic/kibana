/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiTitle } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import {
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
} from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apmEnableTableSearchBar } from '@kbn/observability-plugin/common';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmDocumentType } from '../../../../common/document_type';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { getLatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import {
  APM_SLO_INDICATOR_TYPES,
  type ApmIndicatorType,
} from '../../../../common/slo_indicator_types';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useApmIndexSettingsContext } from '../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { FETCH_STATUS, isPending, isSuccess, useFetcher } from '../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { TransactionOverviewLink } from '../links/apm/transaction_overview_link';
import { AlertingFlyout } from '../../alerting/ui_components/alerting_flyout';
import type { TableSearchBar } from '../managed_table';
import { ManagedTable } from '../managed_table';
import { OverviewTableContainer } from '../overview_table_container';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getColumns } from './get_columns';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getComparisonEnabled } from '../time_comparison/get_comparison_enabled';
import type { ApmFlyoutState } from '../../../hooks/use_alert_slo_actions';
import { useTransactionActions } from './get_transaction_actions';

type ApiResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics'>;

const INITIAL_STATE: ApiResponse & { requestId: string } = {
  requestId: '',
  transactionGroups: [],
  maxCountExceeded: false,
  transactionOverflowCount: 0,
  hasActiveAlerts: false,
};

interface Props {
  hideTitle?: boolean;
  hideViewTransactionsLink?: boolean;
  numberOfTransactionsPerPage?: number;
  showPerPageOptions?: boolean;
  showMaxTransactionGroupsExceededWarning?: boolean;
  environment: string;
  fixedHeight?: boolean;
  kuery: string;
  start: string;
  end: string;
  saveTableOptionsToUrl?: boolean;
  showSparkPlots?: boolean;
  onLoadTable?: () => void;
}

export function TransactionsTable({
  fixedHeight = false,
  hideViewTransactionsLink = false,
  hideTitle = false,
  numberOfTransactionsPerPage = 10,
  showPerPageOptions = true,
  showMaxTransactionGroupsExceededWarning = false,
  environment,
  kuery,
  start,
  end,
  saveTableOptionsToUrl = false,
  onLoadTable,
  showSparkPlots,
}: Props) {
  const { link } = useApmRouter();
  const { core, observabilityAIAssistant, share } = useApmPluginContext();
  const { slo: sloPlugin } = useKibana<ApmPluginStartDeps>().services;
  const [renderedItems, setRenderedItems] = useState<ApiResponse['transactionGroups']>([]);

  const [flyoutState, setFlyoutState] = useState<ApmFlyoutState>({ type: 'closed' });

  const openAlertFlyout = useCallback((ruleType: ApmRuleType, transactionName: string) => {
    setFlyoutState({ type: 'alert', ruleType, transactionName });
  }, []);

  const openSloFlyout = useCallback((indicatorType: ApmIndicatorType, transactionName: string) => {
    setFlyoutState({ type: 'slo', indicatorType, transactionName });
  }, []);

  const closeFlyout = useCallback(() => {
    setFlyoutState({ type: 'closed' });
  }, []);

  const {
    query,
    query: { comparisonEnabled, offset, latencyAggregationType: latencyAggregationTypeFromQuery },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview',
    '/services/{serviceName}/transactions/view'
  );

  const latencyAggregationType = getLatencyAggregationType(latencyAggregationTypeFromQuery);

  const defaultComparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled: comparisonEnabled,
  });

  const { isLarge } = useBreakpoints();
  const shouldShowSparkPlots = showSparkPlots ?? !isLarge;
  const { transactionType, serviceName } = useApmServiceContext();
  const { indexSettings = [] } = useApmIndexSettingsContext();

  const exploreWithSparklines = useMemo(() => {
    const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR);
    const indices = indexSettings
      .filter((s) => ['span', 'transaction'].includes(s.configurationName))
      .map((s) => s.savedValue ?? s.defaultValue)
      .filter(Boolean)
      .join(',');

    if (!discoverLocator || !indices) return undefined;

    const esqlQuery = [
      `FROM ${indices}`,
      `| WHERE ${PROCESSOR_EVENT} == "transaction"`,
      `| WHERE ${SERVICE_NAME} == "${serviceName}"`,
      `| EVAL duration_ms = TO_DOUBLE(${TRANSACTION_DURATION}) / 1000`,
      `| EVAL is_error = CASE(${EVENT_OUTCOME} == "failure", 1, 0)`,
      `| STATS latency = SPARKLINE(AVG(duration_ms), ${AT_TIMESTAMP}, 20, ?_tstart, ?_tend), avg_ms = AVG(duration_ms), errors = SPARKLINE(SUM(is_error), ${AT_TIMESTAMP}, 20, ?_tstart, ?_tend), e_count = SUM(is_error), throughput = SPARKLINE(COUNT(${TRANSACTION_ID}), ${AT_TIMESTAMP}, 20, ?_tstart, ?_tend), t_count = COUNT(${TRANSACTION_ID}) BY ${TRANSACTION_NAME}`,
    ].join('\n');

    return discoverLocator.getRedirectUrl({
      timeRange: { from: start, to: end },
      query: { esql: esqlQuery },
      hideChart: true,
      tab: { id: 'new', label: `${serviceName} - Transactions` },
    });
  }, [share, indexSettings, serviceName, start, end]);
  const [searchQuery, setSearchQueryDebounced] = useStateDebounced('');

  const { mainStatistics, mainStatisticsStatus, detailedStatistics, detailedStatisticsStatus } =
    useTableData({
      comparisonEnabled,
      end,
      environment,
      kuery,
      latencyAggregationType,
      offset,
      searchQuery,
      serviceName,
      start,
      transactionType,
      renderedItems,
    });

  useEffect(() => {
    if (isSuccess(mainStatisticsStatus) && isSuccess(detailedStatisticsStatus)) {
      onLoadTable?.();
    }
  }, [mainStatisticsStatus, detailedStatisticsStatus, onLoadTable, end, start]);

  const columns = useMemo(() => {
    return getColumns({
      serviceName,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      detailedStatisticsLoading: isPending(detailedStatisticsStatus),
      detailedStatistics,
      comparisonEnabled: defaultComparisonEnabled,
      shouldShowSparkPlots,
      offset,
      transactionOverflowCount: mainStatistics.transactionOverflowCount,
      showAlertsColumn: mainStatistics.hasActiveAlerts,
      link,
      query,
    });
  }, [
    defaultComparisonEnabled,
    detailedStatistics,
    detailedStatisticsStatus,
    latencyAggregationType,
    link,
    mainStatistics.hasActiveAlerts,
    mainStatistics.transactionOverflowCount,
    offset,
    query,
    serviceName,
    shouldShowSparkPlots,
  ]);

  const setScreenContext = observabilityAIAssistant?.service.setScreenContext;

  const isTableSearchBarEnabled = core?.uiSettings?.get<boolean>(apmEnableTableSearchBar, true);

  const tableSearchBar: TableSearchBar<ApiResponse['transactionGroups'][0]> = useMemo(() => {
    return {
      isEnabled: isTableSearchBarEnabled,
      fieldsToSearch: ['name'],
      maxCountExceeded: mainStatistics.maxCountExceeded,
      onChangeSearchQuery: setSearchQueryDebounced,
      placeholder: i18n.translate('xpack.apm.transactionsTable.tableSearch.placeholder', {
        defaultMessage: 'Search transactions by name',
      }),
    };
  }, [isTableSearchBarEnabled, mainStatistics.maxCountExceeded, setSearchQueryDebounced]);

  const transactionRowActions = useTransactionActions({
    kuery,
    serviceName,
    environment,
    rangeFrom: query.rangeFrom,
    rangeTo: query.rangeTo,
    indexSettings,
    openAlertFlyout,
    openSloFlyout,
  });

  useEffect(() => {
    return setScreenContext?.({
      data: [
        {
          name: 'top_transactions',
          description: 'The visible transaction groups',
          value: mainStatistics.transactionGroups.map((group) => {
            return {
              name: group.name,
              alertsCount: group.alertsCount,
            };
          }),
        },
      ],
    });
  }, [setScreenContext, mainStatistics]);

  const title = i18n.translate('xpack.apm.transactionsTable.title', {
    defaultMessage: 'Transactions',
  });

  const sloEnvironment = environment === ENVIRONMENT_ALL.value ? ALL_VALUE : environment;

  const sloIndicatorType = flyoutState.type === 'slo' ? flyoutState.indicatorType : null;
  const sloTransactionName = flyoutState.type === 'slo' ? flyoutState.transactionName : null;

  const CreateSloFlyout = useMemo(
    () =>
      sloIndicatorType && sloTransactionName
        ? sloPlugin?.getCreateSLOFormFlyout({
            initialValues: {
              name: `APM SLO for ${serviceName} - ${sloTransactionName}`,
              indicator: {
                type: sloIndicatorType,
                params: {
                  service: serviceName,
                  environment: sloEnvironment,
                  transactionName: sloTransactionName,
                },
              },
            },
            onClose: closeFlyout,
            formSettings: {
              allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
            },
          }) ?? null
        : null,
    [sloPlugin, sloIndicatorType, sloTransactionName, serviceName, sloEnvironment, closeFlyout]
  );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="transactionsGroupTable">
        {!hideTitle && (
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{title}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                  {!hideViewTransactionsLink && (
                    <EuiFlexItem grow={false}>
                      <TransactionOverviewLink
                        serviceName={serviceName}
                        latencyAggregationType={latencyAggregationType}
                        transactionType={transactionType}
                        query={query}
                      >
                        {i18n.translate('xpack.apm.transactionsTable.linkText', {
                          defaultMessage: 'View transactions',
                        })}
                      </TransactionOverviewLink>
                    </EuiFlexItem>
                  )}
                  {exploreWithSparklines && (
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        href={exploreWithSparklines}
                        data-test-subj="exploreWithSparklinesLink"
                      >
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="discoverApp" size="s" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {i18n.translate('xpack.apm.transactionsTable.openInDiscover', {
                              defaultMessage: 'Open in Discover',
                            })}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiLink>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}

        {showMaxTransactionGroupsExceededWarning && mainStatistics.maxCountExceeded && (
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.apm.transactionsCallout.cardinalityWarning.title', {
                defaultMessage:
                  'Number of transaction groups exceed the allowed maximum(1,000) that are displayed.',
              })}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.apm.transactionsCallout.transactionGroupLimit.exceeded"
                  defaultMessage="The maximum number of transaction groups displayed in Kibana has been reached. Try narrowing down results by using the query bar."
                />
              </p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <OverviewTableContainer
            fixedHeight={fixedHeight}
            isEmptyAndNotInitiated={
              mainStatistics.transactionGroups.length === 0 &&
              mainStatisticsStatus === FETCH_STATUS.NOT_INITIATED
            }
          >
            <ManagedTable
              noItemsMessage={
                mainStatisticsStatus === FETCH_STATUS.LOADING
                  ? i18n.translate('xpack.apm.transactionsTable.loading', {
                      defaultMessage: 'Loading...',
                    })
                  : i18n.translate('xpack.apm.transactionsTable.noResults', {
                      defaultMessage: 'No transactions found',
                    })
              }
              items={mainStatistics.transactionGroups}
              columns={columns}
              initialSortField="impact"
              initialSortDirection="desc"
              initialPageSize={numberOfTransactionsPerPage}
              isLoading={mainStatisticsStatus === FETCH_STATUS.LOADING}
              tableSearchBar={tableSearchBar}
              showPerPageOptions={showPerPageOptions}
              saveTableOptionsToUrl={saveTableOptionsToUrl}
              onChangeRenderedItems={setRenderedItems}
              tableCaption={title}
              actions={transactionRowActions}
              tableLayout="auto"
            />
          </OverviewTableContainer>
        </EuiFlexItem>
      </EuiFlexGroup>
      <AlertingFlyout
        addFlyoutVisible={flyoutState.type === 'alert'}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            closeFlyout();
          }
        }}
        ruleType={flyoutState.type === 'alert' ? flyoutState.ruleType : null}
        transactionName={flyoutState.type === 'alert' ? flyoutState.transactionName : undefined}
      />
      {CreateSloFlyout}
    </>
  );
}

function useTableData({
  comparisonEnabled,
  end,
  environment,
  kuery,
  latencyAggregationType,
  offset,
  searchQuery,
  serviceName,
  start,
  transactionType,
  renderedItems,
}: {
  comparisonEnabled: boolean | undefined;
  end: string;
  environment: string;
  kuery: string;
  latencyAggregationType: LatencyAggregationType | undefined;
  offset: string | undefined;
  searchQuery: string;
  serviceName: string;
  start: string;
  transactionType: string | undefined;
  renderedItems: ApiResponse['transactionGroups'];
}) {
  const preferredDataSource = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    numBuckets: 20,
    type: ApmDocumentType.TransactionMetric,
  });

  const shouldUseDurationSummary =
    latencyAggregationType === 'avg' && preferredDataSource?.source?.hasDurationSummaryField;

  const { data: mainStatistics = INITIAL_STATE, status: mainStatisticsStatus } = useFetcher(
    (callApmApi) => {
      if (!latencyAggregationType || !transactionType || !preferredDataSource) {
        return Promise.resolve(undefined);
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
        {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              useDurationSummary: !!shouldUseDurationSummary,
              latencyAggregationType: latencyAggregationType as LatencyAggregationType,
              documentType: preferredDataSource.source.documentType,
              rollupInterval: preferredDataSource.source.rollupInterval,
              searchQuery,
            },
          },
        }
      ).then((mainStatisticsData) => {
        return { requestId: uuidv4(), ...mainStatisticsData };
      });
    },
    [
      searchQuery,
      end,
      environment,
      kuery,
      latencyAggregationType,
      preferredDataSource,
      serviceName,
      shouldUseDurationSummary,
      start,
      transactionType,
    ]
  );

  const itemsToFetch = useMemo(() => renderedItems.map(({ name }) => name), [renderedItems]);

  const { data: detailedStatistics, status: detailedStatisticsStatus } = useFetcher(
    (callApmApi) => {
      if (
        start &&
        end &&
        transactionType &&
        latencyAggregationType &&
        preferredDataSource &&
        itemsToFetch.length > 0
      ) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                bucketSizeInSeconds: preferredDataSource.bucketSizeInSeconds,
                transactionType,
                documentType: preferredDataSource.source.documentType,
                rollupInterval: preferredDataSource.source.rollupInterval,
                useDurationSummary: !!shouldUseDurationSummary,
                latencyAggregationType: latencyAggregationType as LatencyAggregationType,
                transactionNames: JSON.stringify(itemsToFetch),
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              },
            },
          }
        );
      }
    },
    // only fetches detailed statistics when `currentPageItems` is updated.

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainStatistics.requestId, itemsToFetch, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return {
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}
