/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { px } from '../../../style/variables';
import { CorrelationsTable } from './correlations_table';
import { ChartContainer } from '../../shared/charts/chart_container';
import { useTheme } from '../../../hooks/use_theme';
import { CustomFields } from './custom_fields';
import { useFieldNames } from './use_field_names';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useUiTracker } from '../../../../../observability/public';

type CorrelationsApiResponse = NonNullable<
  APIReturnType<'GET /api/apm/correlations/failed_transactions'>
>;

type SignificantTerm = NonNullable<
  CorrelationsApiResponse['significantTerms']
>[0];

interface Props {
  onClose: () => void;
}

export function ErrorCorrelations({ onClose }: Props) {
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
    `apm.correlations.errors.fields:${serviceName}`,
    defaultFieldNames
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/correlations/failed_transactions',
          params: {
            query: {
              environment,
              serviceName,
              transactionName,
              transactionType,
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
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
      fieldNames,
    ]
  );

  const trackApmEvent = useUiTracker({ app: 'apm' });
  trackApmEvent({ metric: 'view_errors_correlations' });

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s">
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
            data={data}
            status={status}
            selectedSignificantTerm={selectedSignificantTerm}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CorrelationsTable
            percentageColumnName={i18n.translate(
              'xpack.apm.correlations.error.percentageColumnName',
              { defaultMessage: '% of failed transactions' }
            )}
            significantTerms={data?.significantTerms}
            status={status}
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

function ErrorTimeseriesChart({
  data,
  selectedSignificantTerm,
  status,
}: {
  data?: CorrelationsApiResponse;
  selectedSignificantTerm: SignificantTerm | null;
  status: FETCH_STATUS;
}) {
  const theme = useTheme();
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
          id={i18n.translate(
            'xpack.apm.correlations.error.chart.overallErrorRateLabel',
            { defaultMessage: 'Overall error rate' }
          )}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={data?.overall?.timeseries ?? []}
          curve={CurveType.CURVE_MONOTONE_X}
        />

        {selectedSignificantTerm !== null ? (
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
