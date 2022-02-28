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
import React, { useMemo } from 'react';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { asInteger } from '../../../../../common/utils/formatters';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { truncate, unit } from '../../../../utils/style';
import { ErrorDetailLink } from '../../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';

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
  font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  ${truncate('100%')};
`;

const Culprit = euiStyled.div`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

type ErrorGroupItem =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>['errorGroups'][0];
type ErrorGroupDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

interface Props {
  mainStatistics: ErrorGroupItem[];
  serviceName: string;
  detailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
}

function ErrorGroupList({
  mainStatistics,
  serviceName,
  detailedStatistics,
  comparisonEnabled,
}: Props) {
  const { query } = useApmParams('/services/{serviceName}/errors');

  const columns = useMemo(() => {
    return [
      {
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
            <GroupIdLink serviceName={serviceName} errorGroupId={groupId}>
              {groupId.slice(0, 5) || NOT_AVAILABLE_LABEL}
            </GroupIdLink>
          );
        },
      },
      {
        name: i18n.translate('xpack.apm.errorsTable.typeColumnLabel', {
          defaultMessage: 'Type',
        }),
        field: 'type',
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
        width: '50%',
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
              <br />
              <EuiToolTip
                id="error-culprit-tooltip"
                content={item.culprit || NOT_AVAILABLE_LABEL}
              >
                <Culprit>{item.culprit || NOT_AVAILABLE_LABEL}</Culprit>
              </EuiToolTip>
            </MessageAndCulpritCell>
          );
        },
      },
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
      },
      {
        field: 'lastSeen',
        sortable: true,
        name: i18n.translate('xpack.apm.errorsTable.lastSeenColumnLabel', {
          defaultMessage: 'Last seen',
        }),
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
        render: (_, { occurrences, groupId }) => {
          const currentPeriodTimeseries =
            detailedStatistics?.currentPeriod?.[groupId]?.timeseries;
          const previousPeriodTimeseries =
            detailedStatistics?.previousPeriod?.[groupId]?.timeseries;
          const { currentPeriodColor, previousPeriodColor } =
            getTimeSeriesColor(ChartType.FAILED_TRANSACTION_RATE);

          return (
            <SparkPlot
              color={currentPeriodColor}
              series={currentPeriodTimeseries}
              valueLabel={i18n.translate(
                'xpack.apm.serviceOveriew.errorsTableOccurrences',
                {
                  defaultMessage: `{occurrences} occ.`,
                  values: {
                    occurrences: asInteger(occurrences),
                  },
                }
              )}
              comparisonSeries={
                comparisonEnabled ? previousPeriodTimeseries : undefined
              }
              comparisonSeriesColor={previousPeriodColor}
            />
          );
        },
      },
    ] as Array<ITableColumn<ErrorGroupItem>>;
  }, [serviceName, query, detailedStatistics, comparisonEnabled]);

  return (
    <ManagedTable
      noItemsMessage={i18n.translate('xpack.apm.errorsTable.noErrorsLabel', {
        defaultMessage: 'No errors found',
      })}
      items={mainStatistics}
      columns={columns}
      initialSortField="occurrences"
      initialSortDirection="desc"
      sortItems={false}
    />
  );
}

export { ErrorGroupList };
