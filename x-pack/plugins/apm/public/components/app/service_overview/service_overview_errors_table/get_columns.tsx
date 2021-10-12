/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, RIGHT_ALIGNMENT } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../../common/utils/formatters';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';

type ErrorGroupMainStatistics =
  APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/main_statistics'>;
type ErrorGroupDetailedStatistics =
  APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/detailed_statistics'>;

export function getColumns({
  serviceName,
  errorGroupDetailedStatistics,
  comparisonEnabled,
}: {
  serviceName: string;
  errorGroupDetailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
}): Array<EuiBasicTableColumn<ErrorGroupMainStatistics['error_groups'][0]>> {
  return [
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
      render: (_, { occurrences, group_id: errorGroupId }) => {
        const currentPeriodTimeseries =
          errorGroupDetailedStatistics?.currentPeriod?.[errorGroupId]
            ?.timeseries;
        const previousPeriodTimeseries =
          errorGroupDetailedStatistics?.previousPeriod?.[errorGroupId]
            ?.timeseries;

        return (
          <SparkPlot
            color="euiColorVis7"
            series={currentPeriodTimeseries}
            valueLabel={i18n.translate(
              'xpack.apm.serviceOveriew.errorsTableOccurrences',
              {
                defaultMessage: `{occurrencesCount} occ.`,
                values: {
                  occurrencesCount: asInteger(occurrences),
                },
              }
            )}
            comparisonSeries={
              comparisonEnabled ? previousPeriodTimeseries : undefined
            }
          />
        );
      },
    },
  ];
}
