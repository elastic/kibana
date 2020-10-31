/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ScaleType,
  Chart,
  LineSeries,
  Axis,
  CurveType,
  BarSeries,
  Position,
  timeFormatter,
  Settings,
} from '@elastic/charts';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
} from '@elastic/eui';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { px } from '../../../style/variables';
import { SignificantTermsTable } from './SignificantTermsTable';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'/api/apm/correlations/slow_transactions', 'GET'>
>;

type SignificantTerm = CorrelationsApiResponse['significantTerms'][0];

export function LatencyCorrelations() {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SignificantTerm | null>(null);

  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { transactionName, transactionType, start, end } = urlParams;

  const { data, status } = useFetcher(() => {
    if (start && end) {
      return callApmApi({
        pathname: '/api/apm/correlations/slow_transactions',
        params: {
          query: {
            serviceName,
            transactionName,
            transactionType,
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            durationPercentile: '50',
            fieldNames:
              'user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,kubernetes.pod.name,url.domain,container.id,service.node.name',
          },
        },
      });
    }
  }, [serviceName, start, end, transactionName, transactionType, uiFilters]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Average latency over time</h4>
              </EuiTitle>
              <LatencyTimeseriesChart
                data={data}
                status={status}
                selectedSignificantTerm={selectedSignificantTerm}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Latency distribution</h4>
              </EuiTitle>
              <LatencyDistributionChart
                data={data}
                status={status}
                selectedSignificantTerm={selectedSignificantTerm}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <SignificantTermsTable
            significantTerms={data?.significantTerms}
            status={status}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function LatencyTimeseriesChart({
  data,
  selectedSignificantTerm,
  status,
}: {
  data?: CorrelationsApiResponse;
  selectedSignificantTerm: SignificantTerm | null;
  status: FETCH_STATUS;
}) {
  if (!data) {
    if (status === FETCH_STATUS.LOADING) {
      return <EuiLoadingChart size="m" />;
    }

    return <div>no data for chart</div>;
  }

  const dateFormatter = timeFormatter('HH:mm:ss');

  const yValues = [
    ...data.overall.timeseries.map((p) => p.y ?? 0),
    ...data.significantTerms.flatMap((term) =>
      term.timeseries.map((p) => p.y ?? 0)
    ),
  ];
  const yMax = Math.max(...yValues);
  const durationFormatter = getDurationFormatter(yMax);

  return (
    <Chart size={{ height: px(200), width: px(600) }}>
      <Settings showLegend legendPosition={Position.Bottom} />

      <Axis
        id="bottom"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={dateFormatter}
      />
      <Axis
        id="left"
        position={Position.Left}
        domain={{ min: 0, max: yMax }}
        tickFormat={(d) => durationFormatter(d).formatted}
      />

      <LineSeries
        id="Overall latency"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        data={data.overall.timeseries}
        curve={CurveType.CURVE_MONOTONE_X}
      />

      {selectedSignificantTerm !== null ? (
        <LineSeries
          id="Latency for selected term"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          color="red"
          data={selectedSignificantTerm.timeseries}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      ) : null}
    </Chart>
  );
}

function LatencyDistributionChart({
  data,
  selectedSignificantTerm,
  status,
}: {
  data?: CorrelationsApiResponse;
  selectedSignificantTerm: SignificantTerm | null;
  status: FETCH_STATUS;
}) {
  if (!data) {
    if (status === FETCH_STATUS.LOADING) {
      return <EuiLoadingChart size="m" />;
    }

    return <div>no data for chart</div>;
  }

  const xMax = Math.max(...data.overall.distribution.map((p) => p.x ?? 0));
  const durationFormatter = getDurationFormatter(xMax);

  const yValues = [
    ...data.overall.distribution.map((p) => p.y ?? 0),
    ...data.significantTerms.flatMap((term) =>
      term.distribution.map((p) => p.y ?? 0)
    ),
  ];
  const yMax = Math.max(...yValues);

  return (
    <Chart size={{ height: px(200), width: px(600) }}>
      <Settings
        showLegend
        legendPosition={Position.Bottom}
        tooltip={{
          headerFormatter: (obj) => {
            const start = durationFormatter(obj.value);
            const end = durationFormatter(
              obj.value + data.distributionInterval
            );

            return `${start.value} - ${end.formatted}`;
          },
        }}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={(d) => durationFormatter(d).formatted}
      />
      <Axis
        id="y-axis"
        position={Position.Left}
        tickFormat={(d) => `${d}%`}
        domain={{ min: 0, max: yMax }}
      />

      <BarSeries
        id="Overall latency distribution"
        xScaleType={ScaleType.Linear}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        data={data.overall.distribution}
        minBarHeight={5}
        tickFormat={(d) => `${roundFloat(d)}%`}
      />

      {selectedSignificantTerm !== null ? (
        <BarSeries
          id="Latency distribution for selected term"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          color="red"
          data={selectedSignificantTerm.distribution}
          minBarHeight={5}
          tickFormat={(d) => `${roundFloat(d)}%`}
        />
      ) : null}
    </Chart>
  );
}

function roundFloat(n: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}
