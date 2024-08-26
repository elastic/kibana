/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { TimeBounds } from '../../../pages/slo_details/types';
import { TimeRange } from '../error_rate_chart/use_lens_definition';
import { SloTabId } from '../../../pages/slo_details/components/slo_details';
import { BurnRateHeader } from './burn_rate_header';
import { useFetchSloBurnRates } from '../../../hooks/use_fetch_slo_burn_rates';
import { ErrorRateChart } from '../error_rate_chart';
import { BurnRate } from './burn_rate';

interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing?: boolean;
  burnRateOptions: BurnRateOption[];
  selectedTabId: SloTabId;
  range?: TimeRange;
  onBrushed?: (timeBounds: TimeBounds) => void;
}

export interface BurnRateOption {
  id: string;
  label: string;
  windowName: string;
  threshold: number;
  duration: number;
  ariaLabel: string;
}

function getWindowsFromOptions(opts: BurnRateOption[]): Array<{ name: string; duration: string }> {
  return opts.map((opt) => ({ name: opt.windowName, duration: `${opt.duration}h` }));
}

export function BurnRates({
  slo,
  isAutoRefreshing,
  burnRateOptions,
  selectedTabId,
  range,
  onBrushed,
}: Props) {
  const [burnRateOption, setBurnRateOption] = useState(burnRateOptions[0]);
  const { isLoading, data } = useFetchSloBurnRates({
    slo,
    shouldRefetch: isAutoRefreshing,
    windows: getWindowsFromOptions(burnRateOptions),
  });

  useEffect(() => {
    if (burnRateOptions.length) {
      setBurnRateOption(burnRateOptions[0]);
    }
  }, [burnRateOptions]);

  const dataTimeRange = range ?? {
    from: moment().subtract(burnRateOption.duration, 'hour').toDate(),
    to: new Date(),
  };

  const threshold = burnRateOption.threshold;
  const burnRate = data?.burnRates.find(
    (curr) => curr.name === burnRateOption.windowName
  )?.burnRate;

  return (
    <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="burnRatePanel">
      <EuiFlexGroup direction="column" gutterSize="m">
        <BurnRateHeader
          burnRateOption={burnRateOption}
          burnRateOptions={burnRateOptions}
          setBurnRateOption={setBurnRateOption}
          selectedTabId={selectedTabId}
        />
        <EuiFlexGroup direction="row" gutterSize="m">
          {selectedTabId !== 'history' && (
            <EuiFlexItem grow={1}>
              <BurnRate threshold={threshold} burnRate={burnRate} slo={slo} isLoading={isLoading} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={3}>
            <ErrorRateChart
              slo={slo}
              dataTimeRange={dataTimeRange}
              threshold={threshold}
              onBrushed={onBrushed}
              selectedTabId={selectedTabId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
