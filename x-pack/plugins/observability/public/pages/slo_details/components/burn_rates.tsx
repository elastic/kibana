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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useState } from 'react';
import { ErrorRateChart } from '../../../components/slo/error_rate_chart';
import { useFetchSloBurnRates } from '../../../hooks/slo/use_fetch_slo_burn_rates';
import { BurnRate } from './burn_rate';

interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
  burnRateOptions: BurnRateOption[];
}

export interface BurnRateOption {
  id: string;
  label: string;
  windowName: string;
  threshold: number;
  duration: number;
}

function getWindowsFromOptions(opts: BurnRateOption[]): Array<{ name: string; duration: string }> {
  return opts.map((opt) => ({ name: opt.windowName, duration: `${opt.duration}h` }));
}

export function BurnRates({ slo, isAutoRefreshing, burnRateOptions }: Props) {
  const [timeRange, setTimeRange] = useState(burnRateOptions[0]);
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: getWindowsFromOptions(burnRateOptions),
  });

  const onTimeRangeChange = (optionId: string) => {
    const selected = burnRateOptions.find((opt) => opt.id === optionId) ?? burnRateOptions[0];
    setTimeRange(selected);
  };

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
                  })}
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
              options={burnRateOptions}
              idSelected={timeRange.id}
              onChange={onTimeRangeChange}
              buttonSize="compressed"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={1}>
            <BurnRate threshold={threshold} burnRate={burnRate} slo={slo} isLoading={isLoading} />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <ErrorRateChart slo={slo} fromRange={fromRange} threshold={threshold} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
