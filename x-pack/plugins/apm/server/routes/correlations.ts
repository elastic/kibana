/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { range } from 'lodash';

// import { toNumberRt } from '@kbn/io-ts-utils';

import type { FieldValuePair } from '../../common/search_strategies/types';
import type { LatencyCorrelation } from '../../common/search_strategies/latency_correlations/types';

import { setupRequest } from '../lib/helpers/setup_request';
import {
  fetchTransactionDurationFieldCandidates,
  fetchTransactionDurationFieldValuePairs,
  fetchTransactionDurationFractions,
  fetchTransactionDurationHistogramRangeSteps,
  fetchTransactionDurationHistograms,
  fetchTransactionDurationPercentiles,
} from '../lib/search_strategies/queries';
import { fetchFieldsStats } from '../lib/search_strategies/queries/field_stats/get_fields_stats';
import { computeExpectationsAndRanges } from '../lib/search_strategies/utils';

import { withApmSpan } from '../utils/with_apm_span';

import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import { environmentRt, kueryRt, rangeRt } from './default_api_types';

const fieldCandidatesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_candidates',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    return withApmSpan(
      'get_correlations_field_candidates',
      async () =>
        await fetchTransactionDurationFieldCandidates(esClient, {
          ...resources.params.query,
          index: indices.transaction,
        })
    );
  },
});

const fieldStatsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/field_stats',
  params: t.type({
    body: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        fieldsToSample: t.array(t.string),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldsToSample, ...params } = resources.params.body;

    return withApmSpan(
      'get_correlations_field_stats',
      async () =>
        await fetchFieldsStats(
          esClient,
          {
            ...params,
            index: indices.transaction,
          },
          fieldsToSample
        )
    );
  },
});

const fieldValuePairsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_value_pairs',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        fieldCandidates: t.array(t.string),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldCandidates, ...params } = resources.params.query;

    return withApmSpan('get_correlations_field_value_pairs', async () => ({
      fieldValuePairs: await fetchTransactionDurationFieldValuePairs(
        esClient,
        {
          ...params,
          index: indices.transaction,
        },
        fieldCandidates
      ),
    }));
  },
});

const significantCorrelationsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/significant_correlations',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        fieldName: t.string, // t.array(t.string),
        fieldValue: t.string, // t.array(t.union([t.string, toNumberRt])),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldName, fieldValue, ...params } = resources.params.query;
    const fieldValuePairs: FieldValuePair[] = [
      {
        fieldName,
        fieldValue,
      },
    ];

    const paramsWithIndex = {
      ...params,
      index: indices.transaction,
    };

    return withApmSpan('get_significant_correlations', async () => {
      // Create an array of ranges [2, 4, 6, ..., 98]
      const percentileAggregationPercents = range(2, 100, 2);
      const { percentiles: percentilesRecords } =
        await fetchTransactionDurationPercentiles(
          esClient,
          paramsWithIndex,
          percentileAggregationPercents
        );
      const percentiles = Object.values(percentilesRecords);

      const { expectations, ranges } =
        computeExpectationsAndRanges(percentiles);

      const { fractions, totalDocCount } =
        await fetchTransactionDurationFractions(
          esClient,
          paramsWithIndex,
          ranges
        );

      const histogramRangeSteps =
        await fetchTransactionDurationHistogramRangeSteps(
          esClient,
          paramsWithIndex
        );

      const latencyCorrelations: LatencyCorrelation[] = [];

      for await (const item of fetchTransactionDurationHistograms(
        esClient,
        () => {},
        paramsWithIndex,
        expectations,
        ranges,
        fractions,
        histogramRangeSteps,
        totalDocCount,
        fieldValuePairs
      )) {
        if (item !== undefined) {
          latencyCorrelations.push(item);
        }
      }

      // TODO Fix CCS warning
      return { latencyCorrelations, ccsWarning: false };
    });
  },
});

export const correlationsRouteRepository = createApmServerRouteRepository()
  .add(fieldCandidatesRoute)
  .add(fieldStatsRoute)
  .add(fieldValuePairsRoute)
  .add(significantCorrelationsRoute);
