/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { asInteger } from '../../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { px, unit } from '../../../../style/variables';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { ErrorOverviewLink } from '../../../shared/Links/apm/ErrorOverviewLink';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';

interface Props {
  serviceName: string;
}

interface ErrorGroupItem {
  name: string;
  last_seen: number;
  group_id: string;
  occurrences: {
    value: number;
    timeseries: Array<{ x: number; y: number }> | null;
  };
}

type SortDirection = 'asc' | 'desc';
type SortField = 'name' | 'last_seen' | 'occurrences';

const PAGE_SIZE = 5;
const DEFAULT_SORT = {
  direction: 'desc' as const,
  field: 'occurrences' as const,
};

export function ServiceOverviewErrorsTable({ serviceName }: Props) {
  const {
    urlParams: { environment, start, end },
    uiFilters,
  } = useUrlParams();
  const { transactionType } = useApmServiceContext();
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

  const columns: Array<EuiBasicTableColumn<ErrorGroupItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.apm.serviceOverview.errorsTableColumnName', {
        defaultMessage: 'Name',
      }),
      render: (_, { name, group_id: errorGroupId }) => {
        return (
          <TruncateWithTooltip
            text={name}
            content={
              <ErrorDetailLink
                serviceName={serviceName}
                errorGroupId={errorGroupId}
              >
                {name}
              </ErrorDetailLink>
            }
          />
        );
      },
    },
    {
      field: 'last_seen',
      name: i18n.translate(
        'xpack.apm.serviceOverview.errorsTableColumnLastSeen',
        {
          defaultMessage: 'Last seen',
        }
      ),
      render: (_, { last_seen: lastSeen }) => {
        return <TimestampTooltip time={lastSeen} timeUnit="minutes" />;
      },
      width: px(unit * 9),
    },
    {
      field: 'occurrences',
      name: i18n.translate(
        'xpack.apm.serviceOverview.errorsTableColumnOccurrences',
        {
          defaultMessage: 'Occurrences',
        }
      ),
      width: px(unit * 12),
      render: (_, { occurrences }) => {
        return (
          <SparkPlot
            color="euiColorVis7"
            series={occurrences.timeseries ?? undefined}
            valueLabel={i18n.translate(
              'xpack.apm.serviceOveriew.errorsTableOccurrences',
              {
                defaultMessage: `{occurrencesCount} occ.`,
                values: {
                  occurrencesCount: asInteger(occurrences.value),
                },
              }
            )}
          />
        );
      },
    },
  ];

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
  } = useFetcher(
    (callApmApi) => {
      if (!start || !end || !transactionType) {
        return;
      }

      return callApmApi({
        endpoint: 'GET /api/apm/services/{serviceName}/error_groups',
        params: {
          path: { serviceName },
          query: {
            environment,
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            size: PAGE_SIZE,
            numBuckets: 20,
            pageIndex: tableOptions.pageIndex,
            sortField: tableOptions.sort.field,
            sortDirection: tableOptions.sort.direction,
            transactionType,
          },
        },
      }).then((response) => {
        return {
          items: response.error_groups,
          totalItemCount: response.total_error_groups,
          tableOptions: {
            pageIndex: tableOptions.pageIndex,
            sort: {
              field: tableOptions.sort.field,
              direction: tableOptions.sort.direction,
            },
          },
        };
      });
    },
    [
      environment,
      start,
      end,
      serviceName,
      uiFilters,
      tableOptions.pageIndex,
      tableOptions.sort.field,
      tableOptions.sort.direction,
      transactionType,
    ]
  );

  const {
    items,
    totalItemCount,
    tableOptions: { pageIndex, sort },
  } = data;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
                  defaultMessage: 'Errors',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ErrorOverviewLink serviceName={serviceName}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
}
