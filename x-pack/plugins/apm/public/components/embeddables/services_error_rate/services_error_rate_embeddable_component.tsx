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
import React from 'react';
import {
  EmbeddableOutput,
  withEmbeddableSubscription,
} from '../../../../../../../src/plugins/embeddable/public';
import { asPercent } from '../../../../common/utils/formatters';
import { getParsedDate } from '../../../context/url_params_context/helpers';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import {
  ServicesErrorRateEmbeddable,
  ServicesErrorRateInput,
} from './services_error_rate_embeddable';

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

function ServicesErrorRateEmbeddableComponentInner({ input }: Props) {
  const { from, to } = input.timeRange;

  const { data: data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      const start = getParsedDate(from)?.toISOString();
      const end = getParsedDate(to)?.toISOString();
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/error_rate',
          params: {
            query: {
              start,
              end,
            },
          },
        });
      }
    },
    [from, to]
  );

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
