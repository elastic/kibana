/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';
import { ValuesType } from 'utility-types';
import {
  asDuration,
  asPercent,
  asTransactionRate,
} from '../../../../../common/utils/formatters';
import { px, truncate, unit } from '../../../../style/variables';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import {
  APIReturnType,
  callApmApi,
} from '../../../../services/rest/createCallApmApi';
import { TransactionDetailLink } from '../../../shared/Links/apm/TransactionDetailLink';
import { TransactionOverviewLink } from '../../../shared/Links/apm/TransactionOverviewLink';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { TableLinkFlexItem } from '../table_link_flex_item';
import { SparkPlotWithValueLabel } from '../../../shared/charts/spark_plot/spark_plot_with_value_label';
import { ImpactBar } from '../../../shared/ImpactBar';
import { ServiceOverviewTable } from '../service_overview_table';

type ServiceTransactionGroupItem = ValuesType<
  APIReturnType<
    'GET /api/apm/services/{serviceName}/overview_transaction_groups'
  >['transaction_groups']
>;

interface Props {
  serviceName: string;
}

type SortField = 'latency' | 'traffic' | 'error_rate' | 'impact';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'impact' as const,
};

const TransactionGroupLinkWrapper = styled.div`
  width: 100%;
  .euiToolTipAnchor {
    width: 100% !important;
  }
`;

const StyledTransactionDetailLink = styled(TransactionDetailLink)`
  display: block;
  ${truncate('100%')}
`;

export function ServiceOverviewTransactionsTable(props: Props) {
  const { serviceName } = props;

  const {
    uiFilters,
    urlParams: { start, end },
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
    if (!start || !end) {
      return;
    }

    return callApmApi({
      endpoint:
        'GET /api/apm/services/{serviceName}/overview_transaction_groups',
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
        },
      },
    }).then((response) => {
      return {
        items: response.transaction_groups,
        totalItemCount: response.total_transaction_groups,
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
      render: (_, { name, transaction_type: transactionType }) => {
        return (
          <TransactionGroupLinkWrapper>
            <EuiToolTip delay="long" content={name}>
              <StyledTransactionDetailLink
                serviceName={serviceName}
                transactionName={name}
                transactionType={transactionType}
              >
                {name}
              </StyledTransactionDetailLink>
            </EuiToolTip>
          </TransactionGroupLinkWrapper>
        );
      },
    },
    {
      field: 'latency',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnLatency',
        {
          defaultMessage: 'Latency',
        }
      ),
      width: px(unit * 10),
      render: (_, { latency }) => {
        return (
          <SparkPlotWithValueLabel
            color="euiColorVis1"
            compact
            series={latency.timeseries ?? undefined}
            valueLabel={asDuration(latency.value)}
            start={new Date(start!).getTime()}
            end={new Date(end!).getTime()}
          />
        );
      },
    },
    {
      field: 'traffic',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnTraffic',
        {
          defaultMessage: 'Traffic',
        }
      ),
      width: px(unit * 10),
      render: (_, { traffic }) => {
        return (
          <SparkPlotWithValueLabel
            color="euiColorVis0"
            compact
            series={traffic.timeseries ?? undefined}
            valueLabel={asTransactionRate(traffic.value)}
            start={new Date(start!).getTime()}
            end={new Date(end!).getTime()}
          />
        );
      },
    },
    {
      field: 'error_rate',
      name: i18n.translate(
        'xpack.apm.serviceOverview.transactionsTableColumnErrorRate',
        {
          defaultMessage: 'Error rate',
        }
      ),
      width: px(unit * 8),
      render: (_, { error_rate: errorRate }) => {
        return (
          <SparkPlotWithValueLabel
            color="euiColorVis7"
            compact
            series={errorRate.timeseries ?? undefined}
            valueLabel={asPercent(errorRate.value, 1)}
            start={new Date(start!).getTime()}
            end={new Date(end!).getTime()}
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
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
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
          <TableLinkFlexItem>
            <TransactionOverviewLink serviceName={serviceName}>
              {i18n.translate(
                'xpack.apm.serviceOverview.transactionsTableLinkText',
                {
                  defaultMessage: 'View transactions',
                }
              )}
            </TransactionOverviewLink>
          </TableLinkFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexItem>
          <TableFetchWrapper status={status}>
            <ServiceOverviewTable
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
          </TableFetchWrapper>
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
