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
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getDurationFormatter } from '../../../../common/utils/formatters';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { CorrelationsTable } from './correlations_table';
import { ChartContainer } from '../../shared/charts/chart_container';
import { useTheme } from '../../../hooks/use_theme';
import { CustomFields, PercentileOption } from './custom_fields';
import { useFieldNames } from './use_field_names';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useUiTracker } from '../../../../../observability/public';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/slow_transactions'>
>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse['significantTerms']
>[0];

interface Props {
  onClose: () => void;
}

export function LatencyCorrelations({ onClose }: Props) {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SignificantTerm | null>(null);

  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams, uiFilters } = useUrlParams();
  const {
    environment,
    transactionName,
    transactionType,
    start,
    end,
  } = urlParams;
  const { defaultFieldNames } = useFieldNames();
  const [fieldNames, setFieldNames] = useLocalStorage(
    `apm.correlations.latency.fields:${serviceName}`,
    defaultFieldNames
  );
  const [
    durationPercentile,
    setDurationPercentile,
  ] = useLocalStorage<PercentileOption>(
    `apm.correlations.latency.threshold:${serviceName}`,
    75
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/slow_transactions',
          params: {
            query: {
              environment,
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              durationPercentile: durationPercentile.toString(10),
              fieldNames: fieldNames.join(','),
            },
          },
        });
      }
    },
    [
      environment,
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      uiFilters,
      durationPercentile,
      fieldNames,
    ]
  );

  const trackApmEvent = useUiTracker({ app: 'apm' });
  trackApmEvent({ metric: 'view_latency_correlations' });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.apm.correlations.latency.description', {
                defaultMessage:
                  'What is slowing down my service? Correlations will help discover a slower performance in a particular cohort of your data. Either by host, version, or other custom fields.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="row">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h4>
                  {i18n.translate(
                    'xpack.apm.correlations.latency.chart.title',
                    { defaultMessage: 'Latency distribution' }
                  )}
                </h4>
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
          <CorrelationsTable
            percentageColumnName={i18n.translate(
              'xpack.apm.correlations.latency.percentageColumnName',
              { defaultMessage: '% of slow transactions' }
            )}
            significantTerms={data?.significantTerms}
            status={status}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            onFilter={onClose}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CustomFields
            fieldNames={fieldNames}
            setFieldNames={setFieldNames}
            showThreshold
            setDurationPercentile={setDurationPercentile}
            durationPercentile={durationPercentile}
          />
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

function LatencyDistributionChart({
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
            'xpack.apm.correlations.latency.chart.overallLatencyDistributionLabel',
            { defaultMessage: 'Overall latency distribution' }
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
              'xpack.apm.correlations.latency.chart.selectedTermLatencyDistributionLabel',
              {
                defaultMessage: '{fieldName}:{fieldValue}',
                values: {
                  fieldName: selectedSignificantTerm.fieldName,
                  fieldValue: selectedSignificantTerm.fieldValue,
                },
              }
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
