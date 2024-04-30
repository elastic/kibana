/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  OnTimeChangeProps,
  OnRefreshProps,
  EuiSpacer,
} from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { useKibana } from '../../../../utils/kibana_react';
import { HistoricalDataCharts } from '../historical_data_charts';
import { useBurnRateOptions } from '../../hooks/use_burn_rate_options';
import { SloTabId } from '../slo_details';
import { BurnRates } from '../../../../components/slo/burn_rate/burn_rates';
import { EventsChartPanel } from '../events_chart_panel';
export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
}

export function SLODetailsHistory({ slo, isAutoRefreshing, selectedTabId }: Props) {
  const { uiSettings } = useKibana().services;

  const { burnRateOptions } = useBurnRateOptions(slo);

  const [start, setStart] = useState('now-30d');
  const [end, setEnd] = useState('now');

  const onTimeChange = (val: OnTimeChangeProps) => {
    setStart(val.start);
    setEnd(val.end);
  };

  const onRefresh = (val: OnRefreshProps) => {};

  const absRange = useMemo(() => {
    return {
      from: new Date(DateMath.parse(start)!.valueOf()),
      to: new Date(DateMath.parse(end, { roundUp: true })!.valueOf()),
      absoluteFrom: DateMath.parse(start)!.valueOf(),
      absoluteTo: DateMath.parse(end, { roundUp: true })!.valueOf(),
    };
  }, [start, end]);

  const onBrushed = useCallback(({ fromUtc, toUtc }) => {
    setStart(fromUtc);
    setEnd(toUtc);
  }, []);

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem
          grow
          css={{
            maxWidth: 500,
          }}
        >
          <EuiSuperDatePicker
            isLoading={false}
            start={start}
            end={end}
            onTimeChange={onTimeChange}
            onRefresh={onRefresh}
            width="full"
            commonlyUsedRanges={uiSettings
              .get('timepicker:quickRanges')
              .map(({ from, to, display }: { from: string; to: string; display: string }) => {
                return {
                  start: from,
                  end: to,
                  label: display,
                };
              })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <BurnRates
            slo={slo}
            isAutoRefreshing={isAutoRefreshing}
            burnRateOptions={burnRateOptions}
            selectedTabId={selectedTabId}
            range={{
              from: absRange.from,
              to: absRange.to,
            }}
            onBrushed={onBrushed}
          />
        </EuiFlexItem>
        <HistoricalDataCharts
          slo={slo}
          selectedTabId={selectedTabId}
          isAutoRefreshing={isAutoRefreshing}
          range={{
            from: start,
            to: end,
          }}
          onBrushed={onBrushed}
        />
        <EuiFlexItem>
          <EventsChartPanel
            slo={slo}
            range={{
              start: absRange.absoluteFrom,
              end: absRange.absoluteTo,
            }}
            selectedTabId={selectedTabId}
            onBrushed={onBrushed}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
