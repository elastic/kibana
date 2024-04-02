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
import { apmEnableTableSearchBar } from '@kbn/observability-plugin/common';
import { isPending } from '../../../../hooks/use_fetcher';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { asBigNumber } from '../../../../../common/utils/formatters';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { truncate, unit } from '../../../../utils/style';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import {
  ITableColumn,
  ManagedTable,
  TableOptions,
  TableSearchBar,
} from '../../../shared/managed_table';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';
import { isTimeComparison } from '../../../shared/time_comparison/get_comparison_options';
import {
  ErrorGroupItem,
  useErrorGroupListData,
} from './use_error_group_list_data';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

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

interface Props {
  serviceName: string;
  isCompactMode?: boolean;
  initialPageSize: number;
  comparisonEnabled?: boolean;
  saveTableOptionsToUrl?: boolean;
  showPerPageOptions?: boolean;
}

const defaultSorting = {
  field: 'occurrences' as const,
  direction: 'desc' as const,
};

export function ErrorGroupList({
  serviceName,
  isCompactMode = false,
  initialPageSize,
  comparisonEnabled,
  saveTableOptionsToUrl,
  showPerPageOptions = true,
}: Props) {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/errors'
  );

  const { core } = useApmPluginContext();

  const isTableSearchBarEnabled = core.uiSettings.get<boolean>(
    apmEnableTableSearchBar,
    true
  );

  const { offset } = query;

  const [renderedItems, setRenderedItems] = useState<ErrorGroupItem[]>([]);

  const [sorting, setSorting] =
    useState<TableOptions<ErrorGroupItem>['sort']>(defaultSorting);

  const {
    setDebouncedSearchQuery,
    mainStatistics,
    mainStatisticsStatus,
    detailedStatistics,
    detailedStatisticsStatus,
  } = useErrorGroupListData({ renderedItems, sorting });

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
        render: (_, item) => {
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

  const tableSearchBar: TableSearchBar<ErrorGroupItem> = useMemo(() => {
    return {
      isEnabled: isTableSearchBarEnabled,
      fieldsToSearch: ['name', 'groupId', 'culprit', 'type'],
      maxCountExceeded: mainStatistics.maxCountExceeded,
      onChangeSearchQuery: setDebouncedSearchQuery,
      placeholder: i18n.translate(
        'xpack.apm.errorsTable.filterErrorsPlaceholder',
        { defaultMessage: 'Search errors by message, type or culprit' }
      ),
    };
  }, [
    isTableSearchBarEnabled,
    mainStatistics.maxCountExceeded,
    setDebouncedSearchQuery,
  ]);

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
      initialSortField={defaultSorting.field}
      initialSortDirection={defaultSorting.direction}
      sortItems={false}
      initialPageSize={initialPageSize}
      isLoading={isMainStatsLoading}
      tableSearchBar={tableSearchBar}
      onChangeRenderedItems={setRenderedItems}
      onChangeSorting={setSorting}
      saveTableOptionsToUrl={saveTableOptionsToUrl}
      showPerPageOptions={showPerPageOptions}
    />
  );
}
