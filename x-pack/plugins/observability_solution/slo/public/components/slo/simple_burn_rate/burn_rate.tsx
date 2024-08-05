/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLoadingChart, EuiStat, EuiTextColor, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { useFetchSloBurnRates } from '../../../hooks/use_fetch_slo_burn_rates';
import { toDuration, toMinutes } from '../../../utils/slo/duration';

interface Props {
  slo: SLOWithSummaryResponse;
  duration: string;
  lastRefreshTime?: number;
}

export function SimpleBurnRate({ slo, duration, lastRefreshTime }: Props) {
  const [refreshTime, setRefreshTime] = React.useState(lastRefreshTime);
  const { isLoading, data, refetch } = useFetchSloBurnRates({
    slo,
    windows: [{ name: 'burn_rate', duration }],
  });

  React.useEffect(() => {
    if (lastRefreshTime !== refreshTime) {
      setRefreshTime(lastRefreshTime);
      refetch();
    }
  }, [refreshTime, lastRefreshTime, refetch]);

  const durationLabel = i18n.translate('xpack.slo.burnRate.durationLabel', {
    defaultMessage: 'Last {duration}',
    values: { duration },
  });

  if (isLoading || data === undefined) {
    return (
      <EuiStat
        title={<EuiLoadingChart />}
        textAlign="left"
        isLoading={isLoading}
        titleColor={'subdued'}
        description={
          <EuiTextColor color="subdued">
            <span>
              <EuiIcon type="clock" color={'subdued'} /> {durationLabel}
            </span>
          </EuiTextColor>
        }
      />
    );
  }

  const burnRate = data.burnRates[0];
  const color = burnRate.burnRate > 1 ? 'danger' : 'success';
  const timeToExhaustLabel = i18n.translate('xpack.slo.burnRate.exhaustionTimeLabel', {
    defaultMessage: 'At this rate, the entire error budget will be exhausted in {hour} hours.',
    values: {
      hour: numeral(
        moment
          .duration(toMinutes(toDuration(slo.timeWindow.duration)) / burnRate.burnRate, 'minutes')
          .asHours()
      ).format('0'),
    },
  });

  return (
    <EuiStat
      title={i18n.translate('xpack.slo.burnRates.value', {
        defaultMessage: '{value}x',
        values: { value: numeral(burnRate.burnRate).format('0.00') },
      })}
      textAlign="left"
      isLoading={isLoading}
      titleColor={color}
      description={
        burnRate.burnRate > 1 ? (
          <EuiToolTip position="top" content={timeToExhaustLabel}>
            <EuiTextColor color={color}>
              <span>
                <EuiIcon type="clock" color={color} /> {durationLabel}
              </span>
            </EuiTextColor>
          </EuiToolTip>
        ) : (
          <EuiTextColor color={color}>
            <span>
              <EuiIcon type="clock" color={color} /> {durationLabel}
            </span>
          </EuiTextColor>
        )
      }
    />
  );
}
