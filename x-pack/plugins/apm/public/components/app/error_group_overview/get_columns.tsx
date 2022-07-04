/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTableColumn,
  EuiIconTip,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { truncate, unit } from '../../../utils/style';
import { ApmRoutes } from '../../routing/apm_route_config';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../shared/charts/helper/get_timeseries_color';
import { SparkPlot } from '../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../shared/links/apm/error_overview_link';
import { TimestampTooltip } from '../../shared/timestamp_tooltip';
import { isTimeComparison } from '../../shared/time_comparison/get_comparison_options';

type ErrorGroupItem =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>['errorGroups'][0];
type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

const GroupIdLink = euiStyled(ErrorDetailLink)`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

const MessageAndCulpritCell = euiStyled.div`
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

export function getColumns({
  serviceName,
  detailedStatisticsLoading,
  detailedStatistics,
  comparisonEnabled,
  query,
}: {
  serviceName: string;
  detailedStatisticsLoading: boolean;
  detailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
}): Array<EuiBasicTableColumn<ErrorGroupItem>> {
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
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );

        return (
          <SparkPlot
            color={currentPeriodColor}
            isLoading={detailedStatisticsLoading}
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
              comparisonEnabled && isTimeComparison(query.offset)
                ? previousPeriodTimeseries
                : undefined
            }
            comparisonSeriesColor={previousPeriodColor}
          />
        );
      },
    },
  ];
}
