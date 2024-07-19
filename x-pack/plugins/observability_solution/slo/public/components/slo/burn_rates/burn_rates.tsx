/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiStat,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { useFetchSloBurnRates } from '../../../hooks/use_fetch_slo_burn_rates';
import { toDuration, toMinutes } from '../../../utils/slo/duration';

interface Props {
  slo: SLOWithSummaryResponse;
}

type WindowName = 'A' | 'B' | 'C' | 'D';

export function BurnRates({ slo }: Props) {
  const windowNameToLabel: Record<WindowName, string> = {
    A: i18n.translate('xpack.slo.burnRates.last5minLabel', {
      defaultMessage: 'Last 5 minutes',
    }),
    B: i18n.translate('xpack.slo.burnRates.last1hLabel', {
      defaultMessage: 'Last 1 hour',
    }),
    C: i18n.translate('xpack.slo.burnRates.last6hLabel', {
      defaultMessage: 'Last 6 hours',
    }),
    D: i18n.translate('xpack.slo.burnRates.last24hLabel', {
      defaultMessage: 'Last 24 hours',
    }),
  };
  const windows: Array<{ name: WindowName; duration: string }> = [
    { name: 'A', duration: '5m' },
    { name: 'B', duration: '1h' },
    { name: 'C', duration: '6h' },
    { name: 'D', duration: '24h' },
  ];

  const { isLoading, data } = useFetchSloBurnRates({ slo, windows });

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatesPanel">
      <EuiFlexGroup direction="row" gutterSize="m">
        {data?.burnRates.map((burnRate) => {
          const color = burnRate.burnRate > 1 ? 'danger' : 'success';
          const timeToExhaustLabel = i18n.translate('xpack.slo.burnRate.exhaustionTimeLabel', {
            defaultMessage:
              'At this rate, the entire error budget will be exhausted in {hour} hours.',
            values: {
              hour: numeral(
                moment
                  .duration(
                    toMinutes(toDuration(slo.timeWindow.duration)) / burnRate.burnRate,
                    'minutes'
                  )
                  .asHours()
              ).format('0'),
            },
          });

          return (
            <EuiFlexItem grow={1}>
              <EuiStat
                title={i18n.translate('xpack.slo.burnRates.value', {
                  defaultMessage: '{value}x',
                  values: { value: burnRate.burnRate },
                })}
                textAlign="left"
                isLoading={isLoading}
                titleColor={color}
                description={
                  burnRate.burnRate > 1 ? (
                    <EuiToolTip position="top" content={timeToExhaustLabel}>
                      <EuiTextColor color={color}>
                        <span>
                          <EuiIcon type="clock" color={color} /> {windowNameToLabel[burnRate.name]}
                        </span>
                      </EuiTextColor>
                    </EuiToolTip>
                  ) : (
                    <EuiTextColor color={color}>
                      <span>
                        <EuiIcon type="clock" color={color} /> {windowNameToLabel[burnRate.name]}
                      </span>
                    </EuiTextColor>
                  )
                }
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
