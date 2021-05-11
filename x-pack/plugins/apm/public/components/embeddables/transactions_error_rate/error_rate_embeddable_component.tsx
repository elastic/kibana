/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiLoadingChart } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { Filter } from '../../../../../../../src/plugins/data/public';
import {
  EmbeddableOutput,
  withEmbeddableSubscription,
} from '../../../../../../../src/plugins/embeddable/public';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';
import { asPercent } from '../../../../common/utils/formatters';
import { getParsedDate } from '../../../context/url_params_context/helpers';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { isTimeseriesEmpty } from '../../shared/charts/helper/helper';
import { ErrorRateEmbeddable, ErrorRateInput } from './error_rate_embeddable';

interface Props {
  embeddable: ErrorRateEmbeddable;
  input: ErrorRateInput;
  output: EmbeddableOutput;
}

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

function findServiceNameFilter(filters: Filter[]) {
  const serviceNameFilter = filters.find((filter) => {
    return filter.meta.key === SERVICE_NAME;
  });
  return serviceNameFilter?.meta.params.query;
}

type ErrorRate = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/error_rate'>;

const INITIAL_STATE: ErrorRate = {
  currentPeriod: {
    noHits: true,
    transactionErrorRate: [],
    average: null,
  },
  previousPeriod: {
    noHits: true,
    transactionErrorRate: [],
    average: null,
  },
};

async function fetchErrorRate({
  serviceName,
  start,
  end,
}: {
  serviceName: string;
  start: string;
  end: string;
}) {
  return callApmApi({
    signal: null,
    endpoint:
      'GET /api/apm/services/{serviceName}/transactions/charts/error_rate',
    params: {
      path: { serviceName },
      query: { transactionType: 'request', start, end },
    },
  });
}

function ErrorRateEmbeddableComponentInner({ input, ...rest }: Props) {
  const serviceName = input.serviceName || findServiceNameFilter(input.filters);
  const { from, to } = input.timeRange;

  const [data, setData] = useState<ErrorRate>(INITIAL_STATE);
  const [status, setStatus] = useState<FETCH_STATUS>(
    FETCH_STATUS.NOT_INITIATED
  );

  useEffect(() => {
    async function callFetchServicesErrorRate() {
      const start = getParsedDate(from)?.toISOString();
      const end = getParsedDate(to)?.toISOString();
      if (serviceName && start && end) {
        setStatus(FETCH_STATUS.LOADING);
        try {
          const result = await fetchErrorRate({ serviceName, start, end });
          setData(result);
          setStatus(FETCH_STATUS.SUCCESS);
        } catch (e) {
          setStatus(FETCH_STATUS.FAILURE);
        }
      }
    }
    callFetchServicesErrorRate();
  }, [serviceName, from, to, setData, setStatus]);

  if (status === FETCH_STATUS.LOADING) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiLoadingChart data-test-subj="loading" size={'xl'} />
      </div>
    );
  }

  const timeseries = [
    {
      data: data.currentPeriod.transactionErrorRate,
      type: 'linemark',
      color: 'red',
      title: 'Error rate (avg.)',
    },
  ];
  const xValues = timeseries.flatMap((item) => item.data.map(({ x }) => x));

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const xFormatter = niceTimeFormatter([min, max]);
  const isEmpty = isTimeseriesEmpty(timeseries);
  const xDomain = isEmpty ? { min: 0, max: 1 } : { min, max };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Chart>
        <Settings
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          xDomain={xDomain}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
          gridLine={{ visible: false }}
        />
        <Axis
          domain={{ min: 0, max: 1 }}
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={yLabelFormat}
          labelFormat={yLabelFormat}
        />

        {timeseries.map((serie) => {
          const Series = serie.type === 'area' ? AreaSeries : LineSeries;

          return (
            <Series
              key={serie.title}
              id={serie.title}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={isEmpty ? [] : serie.data}
              color={serie.color}
              curve={CurveType.CURVE_MONOTONE_X}
            />
          );
        })}
      </Chart>
    </div>
  );
}

export const ErrorRateEmbeddableComponent = withEmbeddableSubscription<
  ErrorRateInput,
  EmbeddableOutput,
  ErrorRateEmbeddable
>(ErrorRateEmbeddableComponentInner);
