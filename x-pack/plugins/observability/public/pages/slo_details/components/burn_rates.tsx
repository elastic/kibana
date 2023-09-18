/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBetaBadge,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { ErrorRateChart } from '../../../components/slo/error_rate_chart';
import { useFetchSloBurnRates } from '../../../hooks/slo/use_fetch_slo_burn_rates';
import { BurnRate } from './burn_rate';

interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
}

const CRITICAL = 'CRITICAL';
const HIGH = 'HIGH';
const MEDIUM = 'MEDIUM';
const LOW = 'LOW';

const WINDOWS = [
  { name: CRITICAL, duration: '1h' },
  { name: HIGH, duration: '6h' },
  { name: MEDIUM, duration: '24h' },
  { name: LOW, duration: '72h' },
];

const TIME_RANGE_OPTIONS = [
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.observability.slo.burnRates.fromRange.1hLabel', {
      defaultMessage: '1h',
    }),
    windowName: CRITICAL,
    threshold: 14.4,
    duration: 1,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.observability.slo.burnRates.fromRange.6hLabel', {
      defaultMessage: '6h',
    }),
    windowName: HIGH,
    threshold: 6,
    duration: 6,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.observability.slo.burnRates.fromRange.24hLabel', {
      defaultMessage: '24h',
    }),
    windowName: MEDIUM,
    threshold: 3,
    duration: 24,
  },
  {
    id: htmlIdGenerator()(),
    label: i18n.translate('xpack.observability.slo.burnRates.fromRange.72hLabel', {
      defaultMessage: '72h',
    }),
    windowName: LOW,
    threshold: 1,
    duration: 72,
  },
];

export function BurnRates({ slo, isAutoRefreshing }: Props) {
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: WINDOWS,
  });

  const [timeRangeIdSelected, setTimeRangeIdSelected] = useState(TIME_RANGE_OPTIONS[0].id);
  const [timeRange, setTimeRange] = useState(TIME_RANGE_OPTIONS[0]);
  const onChange = (optionId: string) => {
    setTimeRangeIdSelected(optionId);
  };

  useEffect(() => {
    const selected =
      TIME_RANGE_OPTIONS.find((opt) => opt.id === timeRangeIdSelected) ?? TIME_RANGE_OPTIONS[0];
    setTimeRange(selected);
  }, [timeRangeIdSelected]);

  const fromRange = moment().subtract(timeRange.duration, 'hour').toDate();
  const threshold = timeRange.threshold;
  const burnRate = data?.burnRates.find((br) => br.name === timeRange.windowName)?.burnRate;

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h2>
                  {i18n.translate('xpack.observability.slo.burnRate.title', {
                    defaultMessage: 'Burn rate',
                  })}{' '}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate(
                  'xpack.observability.slo.burnRate.technicalPreviewBadgeTitle',
                  {
                    defaultMessage: 'Technical Preview',
                  }
                )}
                size="s"
                tooltipPosition="bottom"
                tooltipContent={i18n.translate(
                  'xpack.observability.slo.burnRate.technicalPreviewBadgeDescription',
                  {
                    defaultMessage:
                      'This functionality is in technical preview and is subject to change or may be removed in future versions. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Technical preview features are not subject to the support service level agreement of official generally available features.',
                  }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.observability.slo.burnRate.timeRangeBtnLegend', {
                defaultMessage: 'Select the time range',
              })}
              options={TIME_RANGE_OPTIONS}
              idSelected={timeRangeIdSelected}
              onChange={(id) => onChange(id)}
              buttonSize="compressed"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={1}>
            <BurnRate threshold={threshold} burnRate={burnRate} slo={slo} isLoading={isLoading} />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <ErrorRateChart slo={slo} fromRange={fromRange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
