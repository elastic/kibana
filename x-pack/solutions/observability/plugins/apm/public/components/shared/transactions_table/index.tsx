/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { v4 as uuidv4 } from 'uuid';
import { FormattedMessage } from '@kbn/i18n-react';
import { compact } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { apmEnableTableSearchBar } from '@kbn/observability-plugin/common';
import { ApmDocumentType } from '../../../../common/document_type';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { getLatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useStateDebounced } from '../../../hooks/use_debounce';
import { FETCH_STATUS, isPending, useFetcher } from '../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../hooks/use_preferred_data_source_and_bucket_size';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { TransactionOverviewLink } from '../links/apm/transaction_overview_link';
import type { TableSearchBar } from '../managed_table';
import { ManagedTable } from '../managed_table';
import { OverviewTableContainer } from '../overview_table_container';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { getColumns } from './get_columns';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

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

  const {
    query,
    query: { comparisonEnabled, offset, latencyAggregationType: latencyAggregationTypeFromQuery },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/overview'
  );

  const latencyAggregationType = getLatencyAggregationType(latencyAggregationTypeFromQuery);

  const { isLarge } = useBreakpoints();
  const shouldShowSparkPlots = showSparkPlots ?? !isLarge;
  const { transactionType, serviceName } = useApmServiceContext();
  const [searchQuery, setSearchQueryDebounced] = useStateDebounced('');
  const [hasTableLoaded, setHasTableLoaded] = useState(false);
  const [renderedItems, setRenderedItems] = useState<ApiResponse['transactionGroups']>([]);

  const { mainStatistics, mainStatisticsStatus, detailedStatistics, detailedStatisticsStatus } =
    useTableData({
      comparisonEnabled,
      currentPageItems: renderedItems,
      end,
      environment,
      kuery,
      latencyAggregationType,
      offset,
      searchQuery,
      serviceName,
      start,
      transactionType,
    });

  useEffect(() => {
    if (
      mainStatisticsStatus === FETCH_STATUS.SUCCESS &&
      detailedStatisticsStatus === FETCH_STATUS.SUCCESS &&
      onLoadTable &&
      !hasTableLoaded
    ) {
      onLoadTable();
      setHasTableLoaded(true);
    }
  }, [mainStatisticsStatus, detailedStatisticsStatus, onLoadTable, hasTableLoaded]);

  const columns = useMemo(() => {
    return getColumns({
      serviceName,
      latencyAggregationType: latencyAggregationType as LatencyAggregationType,
      detailedStatisticsLoading: isPending(detailedStatisticsStatus),
      detailedStatistics,
      comparisonEnabled,
      shouldShowSparkPlots,
      offset,
      transactionOverflowCount: mainStatistics.transactionOverflowCount,
      showAlertsColumn: mainStatistics.hasActiveAlerts,
      link,
      query,
    });
  }, [
    comparisonEnabled,
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

  const { core, observabilityAIAssistant } = useApmPluginContext();
  const setScreenContext = observabilityAIAssistant?.service.setScreenContext;

  const isTableSearchBarEnabled = core.uiSettings.get<boolean>(apmEnableTableSearchBar, true);

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

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="transactionsGroupTable">
      {!hideTitle && (
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.apm.transactionsTable.title', {
                    defaultMessage: 'Transactions',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {!hideViewTransactionsLink && (
              <EuiFlexItem grow={false}>
                <TransactionOverviewLink
                  serviceName={serviceName}
                  latencyAggregationType={latencyAggregationType}
                  transactionType={transactionType}
                >
                  {i18n.translate('xpack.apm.transactionsTable.linkText', {
                    defaultMessage: 'View transactions',
                  })}
                </TransactionOverviewLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {showMaxTransactionGroupsExceededWarning && mainStatistics.maxCountExceeded && (
        <EuiFlexItem>
          <EuiCallOut
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
            onChangeRenderedItems={setRenderedItems}
            saveTableOptionsToUrl={saveTableOptionsToUrl}
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function useTableData({
  comparisonEnabled,
  currentPageItems,
  end,
  environment,
  kuery,
  latencyAggregationType,
  offset,
  searchQuery,
  serviceName,
  start,
  transactionType,
}: {
  comparisonEnabled: boolean | undefined;
  currentPageItems: ApiResponse['transactionGroups'];
  end: string;
  environment: string;
  kuery: string;
  latencyAggregationType: LatencyAggregationType | undefined;
  offset: string | undefined;
  searchQuery: string;
  serviceName: string;
  start: string;
  transactionType: string | undefined;
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

  const { data: detailedStatistics, status: detailedStatisticsStatus } = useFetcher(
    (callApmApi) => {
      const transactionNames = compact(currentPageItems.map(({ name }) => name));
      if (
        start &&
        end &&
        transactionType &&
        latencyAggregationType &&
        preferredDataSource &&
        transactionNames.length > 0
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
                transactionNames: JSON.stringify(transactionNames.sort()),
                offset: comparisonEnabled && isTimeComparison(offset) ? offset : undefined,
              },
            },
          }
        );
      }
    },
    // only fetches detailed statistics when `currentPageItems` is updated.

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mainStatistics.requestId, currentPageItems, offset, comparisonEnabled],
    { preservePreviousData: false }
  );

  return {
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}
