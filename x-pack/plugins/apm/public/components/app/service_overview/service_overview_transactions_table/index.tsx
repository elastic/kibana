/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ValuesType } from 'utility-types';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../../services/rest/createCallApmApi';
import { px, unit } from '../../../../style/variables';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ImpactBar } from '../../../shared/ImpactBar';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';
import { TransactionOverviewLink } from '../../../shared/Links/apm/transaction_overview_link';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';

type ServiceTransactionGroupItem = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/transactions/groups/overview'>['transactionGroups']
>;

interface Props {
  serviceName: string;
}

type SortField = 'name' | 'latency' | 'throughput' | 'errorRate' | 'impact';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'impact' as const,
};

function getLatencyAggregationTypeLabel(latencyAggregationType?: string) {
  switch (latencyAggregationType) {
    case 'avg': {
      i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.avg',
        {
          defaultMessage: 'Latency (avg.)',
        }
      );
    }
    case 'p95': {
      return i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.p95',
        {
          defaultMessage: 'Latency (95th)',
        }
      );
    }
    case 'p99': {
      return i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency.p99',
        {
          defaultMessage: 'Latency (99th)',
        }
      );
    }
  }
}

export function ServiceOverviewTransactionsTable(props: Props) {
  const { serviceName } = props;
  const { transactionType } = useApmServiceContext();
  const {
    uiFilters,
    urlParams: { start, end, latencyAggregationType },
  } = useUrlParams();

  const [tableOptions, setTableOptions] = useState<{
    pageIndex: number;
    sort: {
      direction: SortDirection;
      field: SortField;
    };
  }>({
    pageIndex: 0,
    sort: DEFAULT_SORT,
  });

  const {
    data = {
      totalItemCount: 0,
      items: [],
      tableOptions: {
        pageIndex: 0,
        sort: DEFAULT_SORT,
      },
    },
    status,
  } = useFetcher(() => {
    if (!start || !end || !latencyAggregationType || !transactionType) {
      return;
    }

    return callApmApi({
      endpoint:
        'GET /api/apm/services/{serviceName}/transactions/groups/overview',
      params: {
        path: { serviceName },
        query: {
          start,
          end,
          uiFilters: JSON.stringify(uiFilters),
          size: PAGE_SIZE,
          numBuckets: 20,
          pageIndex: tableOptions.pageIndex,
          sortField: tableOptions.sort.field,
          sortDirection: tableOptions.sort.direction,
          transactionType,
          latencyAggregationType: latencyAggregationType as LatencyAggregationType,
        },
      },
    }).then((response) => {
      return {
        items: response.transactionGroups,
        totalItemCount: response.totalTransactionGroups,
        tableOptions: {
          pageIndex: tableOptions.pageIndex,
          sort: {
            field: tableOptions.sort.field,
            direction: tableOptions.sort.direction,
          },
        },
      };
    });
  }, [
    serviceName,
    start,
    end,
    uiFilters,
    tableOptions.pageIndex,
    tableOptions.sort.field,
    tableOptions.sort.direction,
    transactionType,
    latencyAggregationType,
  ]);

  const {
    items,
    totalItemCount,
    tableOptions: { pageIndex, sort },
  } = data;

  const columns: Array<EuiBasicTableColumn<ServiceTransactionGroupItem>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnName',
        {
          defaultMessage: 'Name',
        }
      ),
      render: (_, { name, transactionType: type }) => {
        return (
          <TruncateWithTooltip
            text={name}
            content={
              <TransactionDetailLink
                serviceName={serviceName}
                transactionName={name}
                transactionType={type}
                latencyAggregationType={latencyAggregationType}
              >
                {name}
              </TransactionDetailLink>
            }
          />
        );
      },
    },
    {
      field: 'latency',
      name: getLatencyAggregationTypeLabel(latencyAggregationType),
      width: px(unit * 10),
      render: (_, { latency }) => {
        return (
          <SparkPlot
            color="euiColorVis1"
            compact
            series={latency.timeseries ?? undefined}
            valueLabel={asDuration(latency.value)}
          />
        );
      },
    },
    {
      field: 'throughput',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnTroughput',
        {
          defaultMessage: 'Traffic',
        }
      ),
      width: px(unit * 10),
      render: (_, { throughput }) => {
        return (
          <SparkPlot
            color="euiColorVis0"
            compact
            series={throughput.timeseries ?? undefined}
            valueLabel={asTransactionRate(throughput.value)}
          />
        );
      },
    },
    {
      field: 'errorRate',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnErrorRate',
        {
          defaultMessage: 'Error rate',
        }
      ),
      width: px(unit * 8),
      render: (_, { errorRate }) => {
        return (
          <SparkPlot
            color="euiColorVis7"
            compact
            series={errorRate.timeseries ?? undefined}
            valueLabel={asPercent(errorRate.value, 1)}
          />
        );
      },
    },
    {
      field: 'impact',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnImpact',
        {
          defaultMessage: 'Impact',
        }
      ),
      width: px(unit * 5),
      render: (_, { impact }) => {
        return <ImpactBar value={impact ?? 0} size="m" />;
      },
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate(
                  'xpack.apm.serviceOverview.transactionsTableTitle',
                  {
                    defaultMessage: 'Transactions',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TransactionOverviewLink
              serviceName={serviceName}
              latencyAggregationType={latencyAggregationType}
            >
              {i18n.translate(
                'xpack.apm.serviceOverview.transactionsTableLinkText',
                {
                  defaultMessage: 'View transactions',
                }
              )}
            </TransactionOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexItem>
          <TableFetchWrapper status={status}>
            <ServiceOverviewTableContainer
              isEmptyAndLoading={
                items.length === 0 && status === FETCH_STATUS.LOADING
              }
            >
              <EuiBasicTable
                columns={columns}
                items={items}
                pagination={{
                  pageIndex,
                  pageSize: PAGE_SIZE,
                  totalItemCount,
                  pageSizeOptions: [PAGE_SIZE],
                  hidePerPageOptions: true,
                }}
                loading={status === FETCH_STATUS.LOADING}
                onChange={(newTableOptions: {
                  page?: {
                    index: number;
                  };
                  sort?: { field: string; direction: SortDirection };
                }) => {
                  setTableOptions({
                    pageIndex: newTableOptions.page?.index ?? 0,
                    sort: newTableOptions.sort
                      ? {
                          field: newTableOptions.sort.field as SortField,
                          direction: newTableOptions.sort.direction,
                        }
                      : DEFAULT_SORT,
                  });
                }}
                sorting={{
                  enableAllColumns: true,
                  sort: {
                    direction: sort.direction,
                    field: sort.field,
                  },
                }}
              />
            </ServiceOverviewTableContainer>
          </TableFetchWrapper>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
