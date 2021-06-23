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
import {
  CorrelationsTable,
  SelectedSignificantTerm,
} from './correlations_table';
import { ChartContainer } from '../../shared/charts/chart_container';
import { useTheme } from '../../../hooks/use_theme';
import { CustomFields, PercentileOption } from './custom_fields';
import { useFieldNames } from './use_field_names';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useUiTracker } from '../../../../../observability/public';

type OverallLatencyApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/latency/overall_distribution'>
>;

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/latency/slow_transactions'>
>;

interface Props {
  onClose: () => void;
}

export function LatencyCorrelations({ onClose }: Props) {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SelectedSignificantTerm | null>(null);

  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();
  const {
    environment,
    kuery,
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
  const hasFieldNames = fieldNames.length > 0;

  const [
    durationPercentile,
    setDurationPercentile,
  ] = useLocalStorage<PercentileOption>(
    `apm.correlations.latency.threshold:${serviceName}`,
    75
  );

  const { data: overallData, status: overallStatus } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/latency/overall_distribution',
          params: {
            query: {
              environment,
              kuery,
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
    ]
  );

  const maxLatency = overallData?.maxLatency;
  const distributionInterval = overallData?.distributionInterval;
  const fieldNamesCommaSeparated = fieldNames.join(',');

  const { data: correlationsData, status: correlationsStatus } = useFetcher(
    (callApmApi) => {
      if (start && end && hasFieldNames && maxLatency && distributionInterval) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/latency/slow_transactions',
          params: {
            query: {
              environment,
              kuery,
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
              durationPercentile: durationPercentile.toString(10),
              fieldNames: fieldNamesCommaSeparated,
              maxLatency: maxLatency.toString(10),
              distributionInterval: distributionInterval.toString(10),
            },
          },
        });
      }
    },
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      durationPercentile,
      fieldNamesCommaSeparated,
      hasFieldNames,
      maxLatency,
      distributionInterval,
    ]
  );

  const trackApmEvent = useUiTracker({ app: 'apm' });
  trackApmEvent({ metric: 'view_latency_correlations' });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
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
                overallData={overallData}
                correlationsData={
                  hasFieldNames && correlationsData
                    ? correlationsData?.significantTerms
                    : undefined
                }
                status={overallStatus}
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
            significantTerms={
              hasFieldNames && correlationsData
                ? correlationsData?.significantTerms
                : []
            }
            status={correlationsStatus}
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

function getAxisMaxes(data?: OverallLatencyApiResponse) {
  if (!data?.overallDistribution) {
    return { xMax: 0, yMax: 0 };
  }
  const { overallDistribution } = data;
  const xValues = overallDistribution.map((p) => p.x ?? 0);
  const yValues = overallDistribution.map((p) => p.y ?? 0);
  return {
    xMax: Math.max(...xValues),
    yMax: Math.max(...yValues),
  };
}

function getSelectedDistribution(
  significantTerms: CorrelationsApiResponse['significantTerms'],
  selectedSignificantTerm: SelectedSignificantTerm
) {
  if (!significantTerms) {
    return [];
  }
  return (
    significantTerms.find(
      ({ fieldName, fieldValue }) =>
        selectedSignificantTerm.fieldName === fieldName &&
        selectedSignificantTerm.fieldValue === fieldValue
    )?.distribution || []
  );
}

function LatencyDistributionChart({
  overallData,
  correlationsData,
  selectedSignificantTerm,
  status,
}: {
  overallData?: OverallLatencyApiResponse;
  correlationsData?: CorrelationsApiResponse['significantTerms'];
  selectedSignificantTerm: SelectedSignificantTerm | null;
  status: FETCH_STATUS;
}) {
  const theme = useTheme();
  const { xMax, yMax } = getAxisMaxes(overallData);
  const durationFormatter = getDurationFormatter(xMax);

  return (
    <ChartContainer height={200} hasData={!!overallData} status={status}>
      <Chart>
        <Settings
          showLegend
          legendPosition={Position.Bottom}
          tooltip={{
            headerFormatter: (obj) => {
              const start = durationFormatter(obj.value);
              const end = durationFormatter(
                obj.value + overallData?.distributionInterval
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
          color={theme.eui.euiColorVis1}
          data={overallData?.overallDistribution || []}
          minBarHeight={5}
          tickFormat={(d) => `${roundFloat(d)}%`}
        />

        {correlationsData && selectedSignificantTerm ? (
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
            color={theme.eui.euiColorVis2}
            data={getSelectedDistribution(
              correlationsData,
              selectedSignificantTerm
            )}
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
