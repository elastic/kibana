/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  RIGHT_ALIGNMENT,
  CENTER_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { isTimeComparison } from '../time_comparison/get_comparison_options';
import { asInteger } from '../../../../common/utils/formatters';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { truncate } from '../../../utils/style';
import { SparkPlot } from '../charts/spark_plot';
import { ErrorDetailLink } from '../links/apm/error_detail_link';
import { ErrorOverviewLink } from '../links/apm/error_overview_link';
import { TimestampTooltip } from '../timestamp_tooltip';
import { TruncateWithTooltip } from '../truncate_with_tooltip';
import {
  ChartType,
  getTimeSeriesColor,
} from '../charts/helper/get_timeseries_color';
import { ApmRoutes } from '../../routing/apm_route_config';

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

type ErrorGroupMainStatistics = APIReturnType<
  | 'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'
  | 'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'
>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  errorGroupDetailedStatisticsLoading,
  errorGroupDetailedStatistics,
  comparisonEnabled,
  query,
  showErrorType = true,
}: {
  serviceName: string;
  errorGroupDetailedStatisticsLoading: boolean;
  errorGroupDetailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
  showErrorType?: boolean;
}): Array<EuiBasicTableColumn<ErrorGroupMainStatistics['errorGroups'][0]>> {
  const { offset } = query;
  return [
    ...(showErrorType
      ? [
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
                  query={
                    {
                      ...query,
                      kuery: `error.exception.type:"${type}"`,
                    } as TypeOf<
                      ApmRoutes,
                      '/services/{serviceName}/errors'
                    >['query']
                  }
                >
                  {type}
                </ErrorLink>
              );
            },
          } as EuiBasicTableColumn<ErrorGroupMainStatistics['errorGroups'][0]>,
        ]
      : []),
    {
      field: 'name',
      name: i18n.translate('xpack.apm.errorsTable.columnName', {
        defaultMessage: 'Name',
      }),
      render: (_, { name, groupId: errorGroupId }) => {
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
      field: 'lastSeen',
      name: i18n.translate('xpack.apm.errorsTable.columnLastSeen', {
        defaultMessage: 'Last seen',
      }),
      align: showErrorType ? RIGHT_ALIGNMENT : CENTER_ALIGNMENT,
      render: (_, { lastSeen }) => {
        return (
          <span style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <TimestampTooltip time={lastSeen} timeUnit="minutes" />
          </span>
        );
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate('xpack.apm.errorsTable.columnOccurrences', {
        defaultMessage: 'Occurrences',
      }),
      align: RIGHT_ALIGNMENT,
      render: (_, { occurrences, groupId: errorGroupId }) => {
        const currentPeriodTimeseries =
          errorGroupDetailedStatistics?.currentPeriod?.[errorGroupId]
            ?.timeseries;
        const previousPeriodTimeseries =
          errorGroupDetailedStatistics?.previousPeriod?.[errorGroupId]
            ?.timeseries;
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.ERROR_OCCURRENCES
        );

        return (
          <SparkPlot
            type="bar"
            color={currentPeriodColor}
            isLoading={errorGroupDetailedStatisticsLoading}
            series={currentPeriodTimeseries}
            valueLabel={i18n.translate('xpack.apm.errorsTable.occurrences', {
              defaultMessage: `{occurrences} occ.`,
              values: {
                occurrences: asInteger(occurrences),
              },
            })}
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
  ];
}
