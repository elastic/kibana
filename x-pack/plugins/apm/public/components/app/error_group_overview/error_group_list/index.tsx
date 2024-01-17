/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiIconTip,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { useMemo, useState } from 'react';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { asBigNumber } from '../../../../../common/utils/formatters';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { truncate, unit } from '../../../../utils/style';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import { useStateDebounced } from '../../../../hooks/use_debounce';

const GroupIdLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

const MessageAndCulpritCell = euiStyled.div`
  ${truncate('100%')};
`;

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

const MessageLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  ${truncate('100%')};
`;

const Culprit = euiStyled.div`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

type MainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type DetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

type ErrorGroupItem = MainStatistics['errorGroups'][0];
type ErrorFields = keyof ErrorGroupItem;

const INITIAL_MAIN_STATISTICS: MainStatistics = {
  errorGroups: [],
  maxCountExceeded: false,
};

const INITIAL_STATE_DETAILED_STATISTICS: DetailedStatistics = {
  currentPeriod: {},
  previousPeriod: {},
};

interface Props {
  serviceName: string;
  isCompactMode?: boolean;
  pageSize?: number;
  comparisonEnabled?: boolean;
  saveTableOptionsToUrl?: boolean;
}

function ErrorGroupList({
  serviceName,
  isCompactMode = false,
  pageSize = 25,
  comparisonEnabled,
  saveTableOptionsToUrl,
}: Props) {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/errors'
  );
  const { offset } = query;

  const [currentPage, setCurrentPage] = useState<{
    items: ErrorGroupItem[];
    totalCount: number;
  }>({ items: [], totalCount: 0 });

  const {
    setDebouncedSearchQuery,
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  } = useErrorGroupListData({
    currentPageItems: currentPage.items,
    sortField: 'lastSeen', // TODO: make this configurable
    sortDirection: 'desc', // TODO: make this configurable
  });

  const isMainStatsLoading = isPending(mainStatisticsStatus);
  const isDetailedStatsLoading = isPending(detailedStatisticsStatus);

  const columns = useMemo(() => {
    const groupIdColumn: ITableColumn<ErrorGroupItem> = {
      name: (
        <>
          {i18n.translate('xpack.apm.errorsTable.groupIdColumnLabel', {
            defaultMessage: 'Group ID',
          })}{' '}
          <EuiIconTip
            size="s"
            type="questionInCircle"
            color="subdued"
            iconProps={{
              className: 'eui-alignTop',
            }}
            content={i18n.translate(
              'xpack.apm.errorsTable.groupIdColumnDescription',
              {
                defaultMessage:
                  'Hash of the stack trace. Groups similar errors together, even when the error message is different due to dynamic parameters.',
              }
            )}
          />
        </>
      ),
      field: 'groupId',
      sortable: false,
      width: `${unit * 6}px`,
      render: (_, { groupId }) => {
        return (
          <GroupIdLink
            serviceName={serviceName}
            errorGroupId={groupId}
            data-test-subj="errorGroupId"
          >
            {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
          </GroupIdLink>
        );
      },
    };

    return [
      ...(isCompactMode ? [] : [groupIdColumn]),
      {
        name: i18n.translate('xpack.apm.errorsTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        field: 'type',
        width: `${unit * 10}px`,
        sortable: false,
        render: (_, { type }) => {
          return (
            <ErrorLink
              title={type}
              serviceName={serviceName}
              query={{
                ...query,
                kuery: `error.exception.type:"${type}"`,
              }}
            >
              {type}
            </ErrorLink>
          );
        },
      },
      {
        name: i18n.translate(
          'xpack.apm.errorsTable.errorMessageAndCulpritColumnLabel',
          {
            defaultMessage: 'Error message and culprit',
          }
        ),
        field: 'message',
        sortable: false,
        width: '60%',
        render: (_, item: ErrorGroupItem) => {
          return (
            <MessageAndCulpritCell>
              <EuiToolTip
                id="error-message-tooltip"
                content={item.name || NOT_AVAILABLE_LABEL}
              >
                <MessageLink
                  serviceName={serviceName}
                  errorGroupId={item.groupId}
                >
                  {item.name || NOT_AVAILABLE_LABEL}
                </MessageLink>
              </EuiToolTip>
              {isCompactMode ? null : (
                <>
                  <br />
                  <EuiToolTip
                    id="error-culprit-tooltip"
                    content={item.culprit || NOT_AVAILABLE_LABEL}
                  >
                    <Culprit>{item.culprit || NOT_AVAILABLE_LABEL}</Culprit>
                  </EuiToolTip>
                </>
              )}
            </MessageAndCulpritCell>
          );
        },
      },
      ...(isCompactMode
        ? []
        : [
            {
              name: '',
              field: 'handled',
              sortable: false,
              align: RIGHT_ALIGNMENT,
              render: (_, { handled }) =>
                handled === false && (
                  <EuiBadge color="warning">
                    {i18n.translate('xpack.apm.errorsTable.unhandledLabel', {
                      defaultMessage: 'Unhandled',
                    })}
                  </EuiBadge>
                ),
            } as ITableColumn<ErrorGroupItem>,
          ]),
      {
        field: 'lastSeen',
        sortable: true,
        name: i18n.translate('xpack.apm.errorsTable.lastSeenColumnLabel', {
          defaultMessage: 'Last seen',
        }),
        width: `${unit * 6}px`,
        align: RIGHT_ALIGNMENT,
        render: (_, { lastSeen }) =>
          lastSeen ? (
            <TimestampTooltip time={lastSeen} timeUnit="minutes" />
          ) : (
            NOT_AVAILABLE_LABEL
          ),
      },
      {
        field: 'occurrences',
        name: i18n.translate('xpack.apm.errorsTable.occurrencesColumnLabel', {
          defaultMessage: 'Occurrences',
        }),
        sortable: true,
        dataType: 'number',
        align: RIGHT_ALIGNMENT,
        width: `${unit * 12}px`,
        render: (_, { occurrences, groupId }) => {
          const currentPeriodTimeseries =
            detailedStatistics?.currentPeriod?.[groupId]?.timeseries;
          const previousPeriodTimeseries =
            detailedStatistics?.previousPeriod?.[groupId]?.timeseries;
          const { currentPeriodColor, previousPeriodColor } =
            getTimeSeriesColor(ChartType.ERROR_OCCURRENCES);

          return (
            <SparkPlot
              type="bar"
              color={currentPeriodColor}
              isLoading={isDetailedStatsLoading}
              series={currentPeriodTimeseries}
              valueLabel={i18n.translate(
                'xpack.apm.serviceOveriew.errorsTableOccurrences',
                {
                  defaultMessage: `{occurrences} occ.`,
                  values: {
                    occurrences: asBigNumber(occurrences),
                  },
                }
              )}
              comparisonSeries={
                comparisonEnabled && isTimeComparison(offset)
                  ? previousPeriodTimeseries
                  : undefined
              }
              comparisonSeriesColor={previousPeriodColor}
            />
          );
        },
      },
    ] as Array<ITableColumn<ErrorGroupItem>>;
  }, [
    isCompactMode,
    serviceName,
    query,
    detailedStatistics?.currentPeriod,
    detailedStatistics?.previousPeriod,
    isDetailedStatsLoading,
    comparisonEnabled,
    offset,
  ]);

  const tableSearchBar = useMemo(() => {
    return {
      fieldsToSearch: ['name', 'groupId', 'culprit', 'type'] as ErrorFields[],
      maxCountExceeded: mainStatistics.maxCountExceeded,
      onChangeSearchQuery: setDebouncedSearchQuery,
      onChangeCurrentPage: setCurrentPage,
      placeholder: i18n.translate(
        'xpack.apm.errorsTable.filterErrorsPlaceholder',
        { defaultMessage: 'Search errors by message, type or culprit' }
      ),
    };
  }, [mainStatistics.maxCountExceeded, setDebouncedSearchQuery]);

  return (
    <ManagedTable
      noItemsMessage={
        isMainStatsLoading
          ? i18n.translate('xpack.apm.errorsTable.loading', {
              defaultMessage: 'Loading...',
            })
          : i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
              defaultMessage: 'No errors found',
            })
      }
      items={mainStatistics.errorGroups}
      columns={columns}
      initialSortField="occurrences"
      initialSortDirection="desc"
      sortItems={false}
      initialPageSize={pageSize}
      isLoading={isMainStatsLoading}
      tableSearchBar={tableSearchBar}
      saveTableOptionsToUrl={saveTableOptionsToUrl}
    />
  );
}

function useErrorGroupListData({
  currentPageItems,
  sortField,
  sortDirection,
}: {
  currentPageItems: ErrorGroupItem[];
  sortField: string;
  sortDirection: 'asc' | 'desc';
}) {
  const { serviceName } = useApmServiceContext();
  const [searchQuery, setDebouncedSearchQuery] = useStateDebounced('', 200);

  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      offset,
      comparisonEnabled,
    },
  } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/errors'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    data: mainStatistics = INITIAL_MAIN_STATISTICS,
    status: mainStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      const normalizedSortDirection = sortDirection === 'asc' ? 'asc' : 'desc';

      if (start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                sortField,
                sortDirection: normalizedSortDirection,
                searchQuery,
              },
            },
          }
        );
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      sortField,
      sortDirection,
      searchQuery,
    ]
  );

  const {
    data: detailedStatistics = INITIAL_STATE_DETAILED_STATISTICS,
    status: detailedStatisticsStatus,
  } = useFetcher(
    (callApmApi) => {
      if (currentPageItems.length && start && end) {
        return callApmApi(
          'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                numBuckets: 20,
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
              },
              body: {
                groupIds: JSON.stringify(
                  currentPageItems.map(({ groupId }) => groupId).sort()
                ),
              },
            },
          }
        );
      }
    },
    // only fetches agg results when currentPageGroupIds changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPageItems],
    { preservePreviousData: false }
  );

  return {
    setDebouncedSearchQuery,
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  };
}

export { ErrorGroupList };
