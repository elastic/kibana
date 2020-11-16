/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiTitle } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable } from '@elastic/eui';
import { EuiBasicTableColumn } from '@elastic/eui';
import styled from 'styled-components';
import { EuiToolTip } from '@elastic/eui';
import { asInteger } from '../../../../../common/utils/formatters';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/useFetcher';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { ErrorOverviewLink } from '../../../shared/Links/apm/ErrorOverviewLink';
import { TableLinkFlexItem } from '../table_link_flex_item';
import { SparkPlotWithValueLabel } from '../../../shared/charts/spark_plot/spark_plot_with_value_label';
import { callApmApi } from '../../../../services/rest/createCallApmApi';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { px, truncate, unit } from '../../../../style/variables';
import { FetchWrapper } from './fetch_wrapper';

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

const ErrorDetailLinkWrapper = styled.div`
  width: 100%;
  .euiToolTipAnchor {
    width: 100% !important;
  }
`;

const StyledErrorDetailLink = styled(ErrorDetailLink)`
  display: block;
  ${truncate('100%')}
`;

export function ServiceOverviewErrorsTable({ serviceName }: Props) {
  const {
    urlParams: { start, end },
    uiFilters,
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

  const columns: Array<EuiBasicTableColumn<ErrorGroupItem>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.apm.serviceOverview.errorsTableColumnName', {
        defaultMessage: 'Name',
      }),
      render: (_, { name, group_id: errorGroupId }) => {
        return (
          <ErrorDetailLinkWrapper>
            <EuiToolTip delay="long" content={name}>
              <StyledErrorDetailLink
                serviceName={serviceName}
                errorGroupId={errorGroupId}
              >
                {name}
              </StyledErrorDetailLink>
            </EuiToolTip>
          </ErrorDetailLinkWrapper>
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
      width: px(unit * 8),
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
          <SparkPlotWithValueLabel
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
            start={parseFloat(start!)}
            end={parseFloat(end!)}
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
  } = useFetcher(() => {
    if (!start || !end) {
      return;
    }

    return callApmApi({
      pathname: '/api/apm/services/{serviceName}/error_groups',
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
  }, [
    start,
    end,
    serviceName,
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

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.apm.serviceOverview.errorsTableTitle', {
                  defaultMessage: 'Errors',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <TableLinkFlexItem>
            <ErrorOverviewLink serviceName={serviceName}>
              {i18n.translate('xpack.apm.serviceOverview.errorsTableLinkText', {
                defaultMessage: 'View errors',
              })}
            </ErrorOverviewLink>
          </TableLinkFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <FetchWrapper hasData={!!items.length} status={status}>
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
        </FetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
