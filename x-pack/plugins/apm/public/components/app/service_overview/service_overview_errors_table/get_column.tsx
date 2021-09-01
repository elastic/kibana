/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../../common/utils/formatters';
import { BreakPoints } from '../../../../hooks/use_break_points';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { unit } from '../../../../utils/style';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { ListMetric } from '../../../shared/list_metric';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
type ErrorGroupMainStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/main_statistics'>;
type ErrorGroupDetailedStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/detailed_statistics'>;

export function getColumns({
  breakPoints,
  serviceName,
  errorGroupDetailedStatistics,
  comparisonEnabled,
}: {
  breakPoints: BreakPoints;
  serviceName: string;
  errorGroupDetailedStatistics: ErrorGroupDetailedStatistics;
  comparisonEnabled?: boolean;
}): Array<EuiBasicTableColumn<ErrorGroupMainStatistics['error_groups'][0]>> {
  const { isSmall, isLarge } = breakPoints;
  const showWhenSmallOrGreaterThanLarge = isSmall || !isLarge;

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
      render: (_, { lastSeen }) => {
        return <TimestampTooltip time={lastSeen} timeUnit="minutes" />;
      },
      width: `${unit * 9}px`,
      align: 'right',
    },
    {
      field: 'occurrences',
      name: i18n.translate(
        'xpack.apm.serviceOverview.errorsTableColumnOccurrences',
        {
          defaultMessage: 'Occurrences',
        }
      ),
      width: showWhenSmallOrGreaterThanLarge ? `${unit * 11}px` : 'auto',
      render: (_, { occurrences, group_id: errorGroupId }) => {
        const currentPeriodTimeseries =
          errorGroupDetailedStatistics?.currentPeriod?.[errorGroupId]
            ?.timeseries;
        const previousPeriodTimeseries =
          errorGroupDetailedStatistics?.previousPeriod?.[errorGroupId]
            ?.timeseries;

        return (
          <ListMetric
            color="euiColorVis7"
            hideSeries={!showWhenSmallOrGreaterThanLarge}
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
