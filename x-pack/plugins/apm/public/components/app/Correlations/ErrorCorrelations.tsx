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
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiAccordion,
} from '@elastic/eui';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { px } from '../../../style/variables';
import { SignificantTermsTable } from './SignificantTermsTable';
import { ChartContainer } from '../../shared/charts/chart_container';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/failed_transactions'>
>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse['significantTerms']
>[0];

const initialFieldNames = [
  'transaction.name',
  'user.username',
  'user.id',
  'host.ip',
  'user_agent.name',
  'kubernetes.pod.uuid',
  'kubernetes.pod.name',
  'url.domain',
  'container.id',
  'service.node.name',
].map((label) => ({ label }));

export function ErrorCorrelations() {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SignificantTerm | null>(null);

  const [fieldNames, setFieldNames] = useState(initialFieldNames);
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { transactionName, transactionType, start, end } = urlParams;

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/failed_transactions',
          params: {
            query: {
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              fieldNames: fieldNames.map((field) => field.label).join(','),
            },
          },
        });
      }
    },
    [
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      uiFilters,
      fieldNames,
    ]
  );

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>Error rate over time</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrorTimeseriesChart
            data={data}
            status={status}
            selectedSignificantTerm={selectedSignificantTerm}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiAccordion id="accordion" buttonContent="Customize">
            <EuiComboBox
              fullWidth={true}
              placeholder="Select or create options"
              selectedOptions={fieldNames}
              onChange={setFieldNames}
              onCreateOption={(term) =>
                setFieldNames((names) => [...names, { label: term }])
              }
            />
          </EuiAccordion>
        </EuiFlexItem>
        <EuiFlexItem>
          <SignificantTermsTable
            cardinalityColumnName="# of failed transactions"
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
      <Chart size={{ height: px(200), width: '100%' }}>
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
