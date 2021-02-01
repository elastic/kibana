/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asInteger } from '../../../../../common/utils/formatters';
import { px, unit } from '../../../../style/variables';
import { SparkPlot } from '../../../shared/charts/spark_plot';
import { ErrorDetailLink } from '../../../shared/Links/apm/ErrorDetailLink';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';

type ErrorGroupItem = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups'>;
type GroupIdsErrorAggResults = APIReturnType<'GET /api/apm/services/{serviceName}/error_groups/agg_results'>;

export function getColumns({
  serviceName,
  groupIdsErrorAggResults,
}: {
  serviceName: string;
  groupIdsErrorAggResults: GroupIdsErrorAggResults;
}): Array<EuiBasicTableColumn<ErrorGroupItem['error_groups'][0]>> {
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
      render: (_, { occurrences, group_id: errorGroupId }) => {
        const timeseries = groupIdsErrorAggResults
          ? groupIdsErrorAggResults[errorGroupId]?.timeseries
          : undefined;
        return (
          <SparkPlot
            color="euiColorVis7"
            series={timeseries}
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
}
