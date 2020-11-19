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
  Position,
  timeFormatter,
  Settings,
} from '@elastic/charts';
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { px } from '../../../style/variables';
import { SignificantTermsTable } from './SignificantTermsTable';
import { ChartContainer } from '../../shared/charts/chart_container';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/failed_transactions'>
>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse['significantTerms']
>[0];

export function ErrorCorrelations() {
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
        pathname: '/api/apm/correlations/failed_transactions',
        params: {
          query: {
            serviceName,
            transactionName,
            transactionType,
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            fieldNames:
              'transaction.name,user.username,user.id,host.ip,user_agent.name,kubernetes.pod.uuid,kubernetes.pod.name,url.domain,container.id,service.node.name',
          },
        },
      });
    }
  }, [serviceName, start, end, transactionName, transactionType, uiFilters]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>Error rate over time</h4>
          </EuiTitle>
          <ErrorTimeseriesChart
            data={data}
            status={status}
            selectedSignificantTerm={selectedSignificantTerm}
          />
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

function ErrorTimeseriesChart({
  data,
  selectedSignificantTerm,
  status,
}: {
  data?: CorrelationsApiResponse;
  selectedSignificantTerm: SignificantTerm | null;
  status: FETCH_STATUS;
}) {
  const dateFormatter = timeFormatter('HH:mm:ss');

  return (
    <ChartContainer height={200} hasData={!!data} status={status}>
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
          domain={{ min: 0, max: 1 }}
          tickFormat={(d) => `${roundFloat(d * 100)}%`}
        />

        <LineSeries
          id="Overall error rate"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={data?.overall?.timeseries ?? []}
          curve={CurveType.CURVE_MONOTONE_X}
        />

        {selectedSignificantTerm !== null ? (
          <LineSeries
            id="Error rate for selected term"
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
    </ChartContainer>
  );
}

function roundFloat(n: number, digits = 2) {
  const factor = Math.pow(10, digits);
  return Math.round(n * factor) / factor;
}
