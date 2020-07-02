/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumOverviewProjection } from '../../../common/projections/rum_overview';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../helpers/setup_request';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  USER_AGENT_DEVICE,
  USER_AGENT_NAME,
  USER_AGENT_OS,
} from '../../../common/elasticsearch_fieldnames';

export const getBreakdownField = (breakdown: string) => {
  switch (breakdown) {
    case 'Location':
      return CLIENT_GEO_COUNTRY_ISO_CODE;
    case 'Device':
      return USER_AGENT_DEVICE;
    case 'OS':
      return USER_AGENT_OS;
    case 'Browser':
    default:
      return USER_AGENT_NAME;
  }
};

export const getPageLoadDistBreakdown = async (
  setup: Setup & SetupTimeRange & SetupUIFilters,
  minDuration: number,
  maxDuration: number,
  breakdown: string
) => {
  const stepValue = (maxDuration - minDuration) / 50;
  const stepValues = [];

  for (let i = 1; i < 51; i++) {
    stepValues.push((stepValue * i + minDuration).toFixed(2));
  }

  const projection = getRumOverviewProjection({
    setup,
  });

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: projection.body.query.bool,
      },
      aggs: {
        breakdowns: {
          terms: {
            field: getBreakdownField(breakdown),
            size: 9,
          },
          aggs: {
            page_dist: {
              percentile_ranks: {
                field: 'transaction.duration.us',
                values: stepValues,
                keyed: false,
              },
            },
          },
        },
      },
    },
  });

  const { client } = setup;

  const { aggregations } = await client.search(params);

  const pageDistBreakdowns = aggregations?.breakdowns.buckets;

  return pageDistBreakdowns?.map(({ key, page_dist: pageDist }) => {
    return {
      name: String(key),
      data: pageDist.values?.map(({ key: pKey, value }, index: number, arr) => {
        return {
          x: Math.round(pKey / 1000),
          y: index === 0 ? value : value - arr[index - 1].value,
        };
      }),
    };
  });
};
