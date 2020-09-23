/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRumPageLoadTransactionsProjection } from '../../projections/rum_page_load_transactions';
import { ProcessorEvent } from '../../../common/processor_event';
import { mergeProjection } from '../../projections/util/merge_projection';
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
  TRANSACTION_DURATION,
} from '../../../common/elasticsearch_fieldnames';
import {
  getPLDChartSteps,
  MICRO_TO_SEC,
  microToSec,
} from './get_page_load_distribution';

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

export const getPageLoadDistBreakdown = async ({
  setup,
  minDuration,
  maxDuration,
  breakdown,
  urlQuery,
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  minDuration: number;
  maxDuration: number;
  breakdown: string;
  urlQuery?: string;
}) => {
  // convert secs to micros
  const stepValues = getPLDChartSteps({
    minDuration: minDuration * MICRO_TO_SEC,
    maxDuration: maxDuration * MICRO_TO_SEC,
  });

  const projection = getRumPageLoadTransactionsProjection({
    setup,
    urlQuery,
  });

  const params = mergeProjection(projection, {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 0,
      aggs: {
        breakdowns: {
          terms: {
            field: getBreakdownField(breakdown),
            size: 9,
          },
          aggs: {
            page_dist: {
              percentile_ranks: {
                field: TRANSACTION_DURATION,
                values: stepValues,
                keyed: false,
                hdr: {
                  number_of_significant_value_digits: 3,
                },
              },
            },
          },
        },
      },
    },
  });

  const { apmEventClient } = setup;

  const { aggregations } = await apmEventClient.search(params);

  const pageDistBreakdowns = aggregations?.breakdowns.buckets;

  return pageDistBreakdowns?.map(({ key, page_dist: pageDist }) => {
    return {
      name: String(key),
      data: pageDist.values?.map(({ key: pKey, value }, index: number, arr) => {
        return {
          x: microToSec(pKey),
          y: index === 0 ? value : value - arr[index - 1].value,
        };
      }),
    };
  });
};
