/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiLoadingChart } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import {
  EmbeddableOutput,
  withEmbeddableSubscription,
} from '../../../../../../../src/plugins/embeddable/public';
import { asPercent } from '../../../../common/utils/formatters';
import { getParsedDate } from '../../../context/url_params_context/helpers';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import {
  APIReturnType,
  callApmApi,
} from '../../../services/rest/createCallApmApi';
import {
  ServicesErrorRateEmbeddable,
  ServicesErrorRateInput,
} from './services_error_rate_embeddable';
import { getApiFiltersFromInput } from '../helpers';

interface Props {
  embeddable: ServicesErrorRateEmbeddable;
  input: ServicesErrorRateInput;
  output: EmbeddableOutput;
}

function yLabelFormat(y?: number | null) {
  return asPercent(y || 0, 1);
}

type ServicesErrorRate = APIReturnType<'GET /api/apm/services/error_rate'>;

const INITIAL_STATE: ServicesErrorRate = {
  servicesErrorRate: [],
};

async function fetchServicesErrorRate({
  filters = {},
  start,
  end,
}: {
  filters?: Record<string, any>;
  start: string;
  end: string;
}) {
  return callApmApi({
    signal: null,
    endpoint: 'GET /api/apm/services/error_rate',
    params: { query: { start, end, ...filters } },
  });
}

const API_FILTER_OPTIONS_MAP: Record<string, string> = {
  [TRANSACTION_TYPE]: 'transactionType',
  [SERVICE_ENVIRONMENT]: 'environment',
};

function ServicesErrorRateEmbeddableComponentInner({ input }: Props) {
  const filters = useMemo(
    () => getApiFiltersFromInput(input.filters, API_FILTER_OPTIONS_MAP),
    [input]
  );
  const { from, to } = input.timeRange;
  const [data, setData] = useState<ServicesErrorRate>(INITIAL_STATE);
  const [status, setStatus] = useState<FETCH_STATUS>(
    FETCH_STATUS.NOT_INITIATED
  );

  useEffect(() => {
    async function callFetchServicesErrorRate() {
      const start = getParsedDate(from)?.toISOString();
      const end = getParsedDate(to)?.toISOString();
      if (start && end) {
        setStatus(FETCH_STATUS.LOADING);
        try {
          const result = await fetchServicesErrorRate({ start, end, filters });
          setData(result);
          setStatus(FETCH_STATUS.SUCCESS);
        } catch (e) {
          setStatus(FETCH_STATUS.FAILURE);
        }
      }
    }
    callFetchServicesErrorRate();
  }, [from, to, setData, setStatus, filters]);

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

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Chart>
        <Settings
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          xDomain={{ min: 0, max: 1 }}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          // tickFormat={xFormatter}
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

        <BarSeries
          id="Error Rate"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="serviceName"
          yAccessors={['errorRate']}
          data={data.servicesErrorRate}
        />
      </Chart>
    </div>
  );
}

export const ServicesErrorRateEmbeddableComponent = withEmbeddableSubscription<
  ServicesErrorRateInput,
  EmbeddableOutput,
  ServicesErrorRateEmbeddable
>(ServicesErrorRateEmbeddableComponentInner);
