/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  LIGHT_THEME,
  Axis,
  LineSeries,
  Chart,
  HistogramBarSeries,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
// @ts-ignore
import { RIGHT_ALIGNMENT, CENTER_ALIGNMENT } from '@elastic/eui/lib/services';
import { Alert, AlertType } from '../../../../../types';
import { withBulkAlertOperations } from '../../../common/components/with_bulk_alert_api_operations';
import { AlertData, AlertDataItem } from '../../../../lib/alert_api';

const StyledEuiPanel = styled(EuiPanel)<{ height?: number }>`
  display: flex;
  flex-direction: column;
  ${({ height }) => (height != null ? `height: ${height}px;` : '')}
  position: relative;
`;

interface AlertDataHistogramProps {
  alertData: AlertData;
}

export function AlertDataHistogram({ alertData }: AlertDataHistogramProps) {
  const theme = LIGHT_THEME;

  const xAxisId = 'alertsHistogramAxisX';
  const yAxisId = 'alertsHistogramAxisY';
  const id = 'alertsHistogram';
  const yAccessors = useMemo(() => ['y'], []);
  const splitSeriesAccessors = useMemo(() => ['g'], []);
  // const tickFormat = useMemo(() => histogramDateTimeFormatter([from, to]), [from, to]);

  const [metricData, setMetricData] = useState<any[]>([]);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [thresholdData, setThresholdData] = useState<any[]>([]);

  useEffect(() => {
    if (alertData && alertData.metrics && alertData.metrics.length > 0) {
      setMetricData(
        alertData.metrics.map((metricItem: AlertDataItem) => ({
          x: new Date(metricItem['@timestamp']).valueOf(),
          y: metricItem['kibana.rac.alert.value'],
          g: 'Value',
        }))
      );
      setThresholdData(
        alertData.metrics.map((metricItem: AlertDataItem) => ({
          x: new Date(metricItem['@timestamp']).valueOf(),
          y: metricItem['kibana.rac.alert.threshold'],
          g: 'Threshold',
        }))
      );
    } else {
      setThresholdData([]);
      setMetricData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertData?.metrics]);

  useEffect(() => {
    if (alertData && alertData.alerts && alertData.alerts.length > 0) {
      setAlertsData(
        alertData.alerts.map((alertItem: AlertDataItem) => ({
          x: new Date(alertItem['@timestamp']).valueOf(),
          y: alertItem['kibana.rac.alert.value'],
          g: 'Alert',
        }))
      );
    } else {
      setAlertsData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertData?.metrics]);
  return (
    <Fragment>
      <EuiSpacer size="m" />
      <StyledEuiPanel height={300}>
        {/* <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="m">
                  <h2 data-test-subj="header-section-title">Histogram</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem> */}

        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={true}>
            <Chart size={{ height: 200 }}>
              <Settings theme={theme} showLegend={false} />

              <Axis id={xAxisId} position="bottom" /* tickFormat={tickFormat}*/ />

              <Axis id={yAxisId} position="left" />

              <HistogramBarSeries
                id="metricHistogram"
                xScaleType="time"
                yScaleType="linear"
                xAccessor="x"
                yAccessors={yAccessors}
                splitSeriesAccessors={splitSeriesAccessors}
                data={metricData}
              />

              <HistogramBarSeries
                id="alertsHistogram"
                xScaleType="time"
                yScaleType="linear"
                xAccessor="x"
                yAccessors={yAccessors}
                splitSeriesAccessors={splitSeriesAccessors}
                data={alertsData}
              />

              <LineSeries
                id="control"
                name="Control"
                data={thresholdData}
                xAccessor={'x'}
                yAccessors={yAccessors}
                color={['black']}
              />
            </Chart>
          </EuiFlexItem>
          {/* <EuiFlexItem grow={false}>
            {legendItems.length > 0 && (
              <DraggableLegend legendItems={legendItems} height={chartHeight} />
            )}
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </StyledEuiPanel>
    </Fragment>
  );
}
export const AlertDataHistogramWithApi = withBulkAlertOperations(AlertDataHistogram);
