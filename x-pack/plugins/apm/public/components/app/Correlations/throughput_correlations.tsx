/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ScaleType,
  Chart,
  Axis,
  BarSeries,
  Position,
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
  EuiFormRow,
  EuiFieldNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { CorrelationsTable } from './correlations_table';
import { ChartContainer } from '../../shared/charts/chart_container';
import { useTheme } from '../../../hooks/use_theme';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/slow_transactions'>
>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse['significantTerms']
>[0];

const initialFieldNames = [
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

export function ThroughputCorrelations() {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SignificantTerm | null>(null);

  const [fieldNames, setFieldNames] = useState(initialFieldNames);
  const [durationPercentile, setDurationPercentile] = useState('50');
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const { transactionName, transactionType, start, end } = urlParams;

  const { data, status } = useFetcher(() => {
    if (start && end) {
      return callApmApi({
        endpoint: 'GET /api/apm/correlations/slow_transactions',
        params: {
          query: {
            serviceName,
            transactionName,
            transactionType,
            start,
            end,
            uiFilters: JSON.stringify(uiFilters),
            durationPercentile,
            fieldNames: fieldNames.map((field) => field.label).join(','),
          },
        },
      });
    }
  }, [
    serviceName,
    start,
    end,
    transactionName,
    transactionType,
    uiFilters,
    durationPercentile,
    fieldNames,
  ]);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>
                  {i18n.translate(
                    'xpack.apm.correlations.throughput.chart.title',
                    { defaultMessage: 'Throughput distribution' }
                  )}
                </h4>
              </EuiTitle>
              <ThroughputDistributionChart
                data={data}
                status={status}
                selectedSignificantTerm={selectedSignificantTerm}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <CorrelationsTable
            cardinalityColumnName={i18n.translate(
              'xpack.apm.correlations.throughput.cardinalityColumnName',
              { defaultMessage: '# of slow transactions' }
            )}
            significantTerms={data?.significantTerms}
            status={status}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiAccordion
            id="accordion"
            buttonContent={i18n.translate(
              'xpack.apm.correlations.customize.buttonLabel',
              { defaultMessage: 'Customize fields' }
            )}
          >
            <EuiFlexGroup>
              <EuiFlexItem grow={1}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.apm.correlations.customize.thresholdLabel',
                    { defaultMessage: 'Threshold' }
                  )}
                >
                  <EuiFieldNumber
                    value={durationPercentile}
                    onChange={(e) =>
                      setDurationPercentile(e.currentTarget.value)
                    }
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={4}>
                <EuiFormRow
                  fullWidth={true}
                  label={i18n.translate(
                    'xpack.apm.correlations.customize.fieldLabel',
                    { defaultMessage: 'Field' }
                  )}
                  helpText={i18n.translate(
                    'xpack.apm.correlations.customize.fieldHelpText',
                    { defaultMessage: 'Fields to analyse for correlations' }
                  )}
                >
                  <EuiComboBox
                    fullWidth={true}
                    placeholder={i18n.translate(
                      'xpack.apm.correlations.customize.fieldPlaceholder',
                      { defaultMessage: 'Select or create options' }
                    )}
                    selectedOptions={fieldNames}
                    onChange={setFieldNames}
                    onCreateOption={(term) => {
                      setFieldNames((names) => [...names, { label: term }]);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiAccordion>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function getDistributionYMax(data?: CorrelationsApiResponse) {
  if (!data?.overall) {
    return 0;
  }

  const yValues = [
    ...data.overall.distribution.map((p) => p.y ?? 0),
    ...data.significantTerms.flatMap((term) =>
      term.distribution.map((p) => p.y ?? 0)
    ),
  ];
  return Math.max(...yValues);
}

function ThroughputDistributionChart({
  data,
  selectedSignificantTerm,
  status,
}: {
  data?: CorrelationsApiResponse;
  selectedSignificantTerm: SignificantTerm | null;
  status: FETCH_STATUS;
}) {
  const theme = useTheme();
  const xMax = Math.max(
    ...(data?.overall?.distribution.map((p) => p.x ?? 0) ?? [])
  );
  const durationFormatter = getDurationFormatter(xMax);
  const yMax = getDistributionYMax(data);

  return (
    <ChartContainer height={200} hasData={!!data} status={status}>
      <Chart>
        <Settings
          showLegend
          legendPosition={Position.Bottom}
          tooltip={{
            headerFormatter: (obj) => {
              const start = durationFormatter(obj.value);
              const end = durationFormatter(
                obj.value + data?.distributionInterval
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
          id={i18n.translate(
            'xpack.apm.correlations.throughput.chart.overallThroughputDistributionLabel',
            { defaultMessage: 'Overall throughput distribution' }
          )}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={data?.overall?.distribution || []}
          minBarHeight={5}
          tickFormat={(d) => `${roundFloat(d)}%`}
        />

        {selectedSignificantTerm !== null ? (
          <BarSeries
            id={i18n.translate(
              'xpack.apm.correlations.throughput.chart.selectedTermThroughputDistributionLabel',
              { defaultMessage: 'Throughput distribution for selected term' }
            )}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor={'x'}
            yAccessors={['y']}
            color={theme.eui.euiColorAccent}
            data={selectedSignificantTerm.distribution}
            minBarHeight={5}
            tickFormat={(d) => `${roundFloat(d)}%`}
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
