/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getServicesProjection } from '../../../common/projections/services';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { IEnvOptions } from '../service_map/get_service_map';

export async function getPageLoadDistribution(options: IEnvOptions) {
  const { setup } = options;

  const projection = getServicesProjection({
    setup: { ...setup, uiFiltersES: [] },
  });

  const { filter } = projection.body.query.bool;

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          ...projection.body.query.bool,
          filter: filter.concat({
            term: {
              'transaction.type': 'page-load',
            },
          }),
        },
      },
      aggs: {
        durationMinMax: {
          stats: {
            field: 'transaction.duration.us',
          },
        },
        durationPercentiles: {
          percentiles: {
            field: 'transaction.duration.us',
            percents: [50, 80, 90, 95, 96],
            script: {
              lang: 'painless',
              source: "doc['transaction.duration.us'].value / params.timeUnit",
              params: {
                timeUnit: 1000,
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  const minDuration = response.aggregations.durationMinMax.min / 1000;
  const durationPercentiles = response.aggregations.durationPercentiles.values;
  const maxPercentile = durationPercentiles['96.0'];
  const pageDist = await getPercentilesDistribution(
    options,
    minDuration,
    maxPercentile
  );
  return { pageLoadDistribution: pageDist, percentiles: durationPercentiles };
}

const getPercentilesDistribution = async (
  options: IEnvOptions,
  minPercentiles: number,
  maxPercentile: number
) => {
  const stepValue = (maxPercentile - minPercentiles) / 100;
  const stepValues = [];
  for (let i = 1; i < 100; i++) {
    stepValues.push((stepValue * i + minPercentiles).toFixed(2));
  }

  const { setup } = options;

  const projection = getServicesProjection({
    setup: { ...setup, uiFiltersES: [] },
  });

  const { filter } = projection.body.query.bool;

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          ...projection.body.query.bool,
          filter: filter.concat({
            term: {
              'transaction.type': 'page-load',
            },
          }),
        },
      },
      aggs: {
        loadDistribution: {
          percentile_ranks: {
            field: 'transaction.duration.us',
            values: stepValues,
            keyed: false,
            script: {
              lang: 'painless',
              source: "doc['transaction.duration.us'].value / params.timeUnit",
              params: {
                timeUnit: 1000,
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const response = await client.search(params);

  const pageDist = response.aggregations.loadDistribution.values;
  return pageDist.map(({ key, value }, index, arr) => {
    return {
      x: key,
      y: index === 0 ? value : value - arr[index - 1].value,
    };
  });
};
