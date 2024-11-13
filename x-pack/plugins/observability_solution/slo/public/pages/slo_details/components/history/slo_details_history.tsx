/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSuperDatePicker,
  EuiTitle,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import DateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useMemo, useState } from 'react';
import { ErrorRateChart } from '../../../../components/slo/error_rate_chart';
import { useKibana } from '../../../../hooks/use_kibana';
import { TimeBounds } from '../../types';
import { EventsChartPanel } from '../events_chart_panel';
import { HistoricalDataCharts } from '../historical_data_charts';
import { SloTabId } from '../slo_details';

export interface Props {
  slo: SLOWithSummaryResponse;
  isAutoRefreshing: boolean;
  selectedTabId: SloTabId;
}

export function SLODetailsHistory({ slo, isAutoRefreshing, selectedTabId }: Props) {
  const { uiSettings } = useKibana().services;
  const [start, setStart] = useState(`now-${slo.timeWindow.duration}`);
  const [end, setEnd] = useState('now');

  const onTimeChange = (val: OnTimeChangeProps) => {
    setStart(val.start);
    setEnd(val.end);
  };

  const onRefresh = (val: OnRefreshProps) => {};

  const range = useMemo(() => {
    return {
      from: new Date(DateMath.parse(start)!.valueOf()),
      to: new Date(DateMath.parse(end, { roundUp: true })!.valueOf()),
    };
  }, [start, end]);

  const onBrushed = ({ from, to }: TimeBounds) => {
    setStart(from.toISOString());
    setEnd(to.toISOString());
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
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

      <EuiPanel paddingSize="m" color="transparent" hasBorder data-test-subj="errorRatePanel">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.slo.sloDetailsHistory.h2.errorRatePanelTitle', {
                  defaultMessage: 'Error rate',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <ErrorRateChart
            slo={slo}
            dataTimeRange={range}
            onBrushed={onBrushed}
            variant={['VIOLATED', 'DEGRADING'].includes(slo.summary.status) ? 'danger' : 'success'}
          />
        </EuiFlexGroup>
      </EuiPanel>

      <HistoricalDataCharts
        slo={slo}
        selectedTabId={selectedTabId}
        isAutoRefreshing={isAutoRefreshing}
        range={range}
        onBrushed={onBrushed}
      />

      <EventsChartPanel
        slo={slo}
        range={range}
        selectedTabId={selectedTabId}
        onBrushed={onBrushed}
      />
    </EuiFlexGroup>
  );
}
