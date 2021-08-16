/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useUiTracker } from '../../../../../observability/public';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTheme } from '../../../hooks/use_theme';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { ChartContainer } from '../../shared/charts/chart_container';
import {
  CorrelationsTable,
  SelectedSignificantTerm,
} from './correlations_table';
import { CustomFields } from './custom_fields';
import { useFieldNames } from './use_field_names';

type OverallErrorsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/errors/overall_timeseries'>
>;

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/errors/failed_transactions'>
>;

interface Props {
  onClose: () => void;
}

export function ErrorCorrelations({ onClose }: Props) {
  const [
    selectedSignificantTerm,
    setSelectedSignificantTerm,
  ] = useState<SelectedSignificantTerm | null>(null);

  const { serviceName } = useApmServiceContext();
  const { urlParams } = useUrlParams();
  const { transactionName, transactionType, start, end } = urlParams;
  const { defaultFieldNames } = useFieldNames();
  const [fieldNames, setFieldNames] = useLocalStorage(
    `apm.correlations.errors.fields:${serviceName}`,
    defaultFieldNames
  );
  const hasFieldNames = fieldNames.length > 0;

  const {
    query: { environment, kuery },
  } = useApmParams('/services/:serviceName');

  const { data: overallData, status: overallStatus } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/errors/overall_timeseries',
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

  const { data: correlationsData, status: correlationsStatus } = useFetcher(
    (callApmApi) => {
      if (start && end && hasFieldNames) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/errors/failed_transactions',
          params: {
            query: {
              environment,
              kuery,
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
              fieldNames: fieldNames.join(','),
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
      fieldNames,
      hasFieldNames,
    ]
  );

  const trackApmEvent = useUiTracker({ app: 'apm' });
  trackApmEvent({ metric: 'view_errors_correlations' });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.apm.correlations.error.description', {
                defaultMessage:
                  'Why are some transactions failing and returning errors? Correlations will help discover a possible culprit in a particular cohort of your data. Either by host, version, or other custom fields.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('xpack.apm.correlations.error.chart.title', {
                defaultMessage: 'Error rate over time',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <ErrorTimeseriesChart
            overallData={overallData}
            correlationsData={hasFieldNames ? correlationsData : undefined}
            status={overallStatus}
            selectedSignificantTerm={selectedSignificantTerm}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CorrelationsTable
            percentageColumnName={i18n.translate(
              'xpack.apm.correlations.error.percentageColumnName',
              { defaultMessage: '% of failed transactions' }
            )}
            significantTerms={
              hasFieldNames && correlationsData?.significantTerms
                ? correlationsData.significantTerms
                : []
            }
            status={correlationsStatus}
            setSelectedSignificantTerm={setSelectedSignificantTerm}
            onFilter={onClose}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CustomFields fieldNames={fieldNames} setFieldNames={setFieldNames} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

function getSelectedTimeseries(
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
    )?.timeseries || []
  );
}

function ErrorTimeseriesChart({
  overallData,
  correlationsData,
  selectedSignificantTerm,
  status,
}: {
  overallData?: OverallErrorsApiResponse;
  correlationsData?: CorrelationsApiResponse;
  selectedSignificantTerm: SelectedSignificantTerm | null;
  status: FETCH_STATUS;
}) {
  const theme = useTheme();
  const dateFormatter = timeFormatter('HH:mm:ss');

  return (
    <ChartContainer height={200} hasData={!!overallData} status={status}>
      <Chart size={{ height: 200, width: '100%' }}>
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
          id={i18n.translate(
            'xpack.apm.correlations.error.chart.overallErrorRateLabel',
            { defaultMessage: 'Overall error rate' }
          )}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={overallData?.overall?.timeseries ?? []}
          curve={CurveType.CURVE_MONOTONE_X}
          color={theme.eui.euiColorVis7}
        />

        {correlationsData && selectedSignificantTerm ? (
          <LineSeries
            id={i18n.translate(
              'xpack.apm.correlations.error.chart.selectedTermErrorRateLabel',
              {
                defaultMessage: '{fieldName}:{fieldValue}',
                values: {
                  fieldName: selectedSignificantTerm.fieldName,
                  fieldValue: selectedSignificantTerm.fieldValue,
                },
              }
            )}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={'x'}
            yAccessors={['y']}
            color={theme.eui.euiColorAccent}
            data={getSelectedTimeseries(
              correlationsData.significantTerms,
              selectedSignificantTerm
            )}
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
