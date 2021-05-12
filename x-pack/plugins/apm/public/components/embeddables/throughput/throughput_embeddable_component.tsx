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
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiLoadingChart, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  EmbeddableOutput,
  withEmbeddableSubscription,
} from '../../../../../../../src/plugins/embeddable/public';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { asTransactionRate } from '../../../../common/utils/formatters';
import { getParsedDate } from '../../../context/url_params_context/helpers';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import { getApiFiltersFromInput } from '../helpers';
import { ThroughputEmbeddable, ThroughputInput } from './throughput_embeddable';

const CentralizedContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface Props {
  embeddable: ThroughputEmbeddable;
  input: ThroughputInput;
  output: EmbeddableOutput;
}

const API_FILTER_OPTIONS_MAP: Record<string, string> = {
  [SERVICE_NAME]: 'serviceName',
  [TRANSACTION_TYPE]: 'transactionType',
  [SERVICE_ENVIRONMENT]: 'environment',
};

type Throughput = APIReturnType<'GET /api/apm/services/{serviceName}/throughput'>;

const INITIAL_STATE: Throughput = {
  currentPeriod: [],
  previousPeriod: [],
};

async function fetchThroughput({
  filters,
  start,
  end,
}: {
  filters: Record<string, any>;
  start: string;
  end: string;
}) {
  const { serviceName, transactionType = 'request', environment } = filters;
  return callApmApi({
    signal: null,
    endpoint: 'GET /api/apm/services/{serviceName}/throughput',
    params: {
      path: { serviceName },
      query: { transactionType, start, end, environment },
    },
  });
}

function ThroughputEmbeddableComponentInner({ input, ...rest }: Props) {
  const filters = useMemo(
    () => getApiFiltersFromInput(input.filters, API_FILTER_OPTIONS_MAP),
    [input]
  );
  const { from, to } = input.timeRange;

  const [data, setData] = useState<Throughput>(INITIAL_STATE);
  const [status, setStatus] = useState<FETCH_STATUS>(
    FETCH_STATUS.NOT_INITIATED
  );

  useEffect(() => {
    async function TallFetchServicesthroughput() {
      const start = getParsedDate(from)?.toISOString();
      const end = getParsedDate(to, { roundUp: true })?.toISOString();
      if (filters?.serviceName && start && end) {
        setStatus(FETCH_STATUS.LOADING);
        try {
          const result = await fetchThroughput({ filters, start, end });
          setData(result);
          setStatus(FETCH_STATUS.SUCCESS);
        } catch (e) {
          setStatus(FETCH_STATUS.FAILURE);
        }
      }
    }
    TallFetchServicesthroughput();
  }, [filters, from, to, setData, setStatus]);

  if (!filters?.serviceName) {
    return (
      <CentralizedContainer>
        <EuiText>
          {i18n.translate(
            'xpack.apm.embeddables.throughput.serviceNameFilterRequiredLabel',
            { defaultMessage: 'Filter by service.name required' }
          )}
        </EuiText>
      </CentralizedContainer>
    );
  }

  if (status === FETCH_STATUS.LOADING) {
    return (
      <CentralizedContainer>
        <EuiLoadingChart data-test-subj="loading" size={'xl'} />
      </CentralizedContainer>
    );
  }

  const xValues = data.currentPeriod.flatMap(({ x }) => x);
  const min = Math.min(...xValues);
  const max = Math.max(...xValues);
  const xFormatter = niceTimeFormatter([min, max]);
  const xDomain = data.currentPeriod.length ? { min, max } : { min: 0, max: 1 };

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
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={asTransactionRate}
          labelFormat={asTransactionRate}
        />
        <LineSeries
          id={i18n.translate('xpack.apm.embeddables.throughput.chartLegend', {
            defaultMessage: 'Throughput (avg.)',
          })}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={data.currentPeriod}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      </Chart>
    </div>
  );
}

export const ThroughputEmbeddableComponent = withEmbeddableSubscription<
  ThroughputInput,
  EmbeddableOutput,
  ThroughputEmbeddable
>(ThroughputEmbeddableComponentInner);
