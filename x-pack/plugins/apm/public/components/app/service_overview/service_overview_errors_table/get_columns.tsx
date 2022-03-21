/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import { asInteger } from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { truncate } from '../../../../utils/style';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/links/apm/error_detail_link';
import { ErrorOverviewLink } from '../../../shared/links/apm/error_overview_link';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import {
  ChartType,
  getTimeSeriesColor,
} from '../../../shared/charts/helper/get_timeseries_color';
import { ApmRoutes } from '../../../routing/apm_route_config';

const ErrorLink = euiStyled(ErrorOverviewLink)`
  ${truncate('100%')};
`;

type ErrorGroupMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  errorGroupDetailedStatisticsLoading,
  errorGroupDetailedStatistics,
  comparisonEnabled,
  query,
}: {
  serviceName: string;
  errorGroupDetailedStatisticsLoading: boolean;
  errorGroupDetailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
  query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
}): Array<EuiBasicTableColumn<ErrorGroupMainStatistics['errorGroups'][0]>> {
  return [
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
              } as TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query']
            }
          >
            {type}
          </ErrorLink>
        );
      },
    },
    {
      field: 'name',
      name: i18n.translate('xpack.apm.serviceOverview.errorsTableColumnName', {
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
      name: i18n.translate(
        'xpack.apm.serviceOverview.errorsTableColumnLastSeen',
        {
          defaultMessage: 'Last seen',
        }
      ),
      align: RIGHT_ALIGNMENT,
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
      name: i18n.translate(
        'xpack.apm.serviceOverview.errorsTableColumnOccurrences',
        {
          defaultMessage: 'Occurrences',
        }
      ),
      align: RIGHT_ALIGNMENT,
      render: (_, { occurrences, groupId: errorGroupId }) => {
        const currentPeriodTimeseries =
          errorGroupDetailedStatistics?.currentPeriod?.[errorGroupId]
            ?.timeseries;
        const previousPeriodTimeseries =
          errorGroupDetailedStatistics?.previousPeriod?.[errorGroupId]
            ?.timeseries;
        const { currentPeriodColor, previousPeriodColor } = getTimeSeriesColor(
          ChartType.FAILED_TRANSACTION_RATE
        );

        return (
          <SparkPlot
            color={currentPeriodColor}
            seriesLoading={errorGroupDetailedStatisticsLoading}
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
  ];
}
