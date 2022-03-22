/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';

import { i18n } from '@kbn/i18n';
import { toNumberRt } from '@kbn/io-ts-utils';

import { isActivePlatinumLicense } from '../../../common/license_check';

import { setupRequest } from '../../lib/helpers/setup_request';
import {
  fetchChangePointPValues,
  fetchSpikeAnalysisFrequentItems,
  fetchPValues,
  fetchSignificantCorrelations,
  fetchTransactionDurationFieldCandidates,
  fetchTransactionDurationFieldValuePairs,
  fetchFieldValueFieldStats,
} from './queries';
import { fetchFieldsStats } from './queries/field_stats/get_fields_stats';

import { withApmSpan } from '../../utils/with_apm_span';

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { LatencyCorrelation } from '../../../common/correlations/latency_correlations/types';
import {
  FieldStats,
  TopValuesStats,
} from '../../../common/correlations/field_stats_types';
import { FieldValuePair } from '../../../common/correlations/types';
import { FailedTransactionsCorrelation } from '../../../common/correlations/failed_transactions_correlations/types';
import type {
  ChangePoint,
  FrequentItems,
} from '../../../common/correlations/change_point/types';

const INVALID_LICENSE = i18n.translate('xpack.apm.correlations.license.text', {
  defaultMessage:
    'To use the correlations API, you must be subscribed to an Elastic Platinum license.',
});

const fieldCandidatesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_candidates',
  params: t.type({
    query: t.intersection([
      t.partial({
        indexPatternTitle: t.string,
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
  handler: async (resources): Promise<{ fieldCandidates: string[] }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { indexPatternTitle, ...paramsQuery } = resources.params.query;

    return withApmSpan(
      'get_correlations_field_candidates',
      async (): Promise<{ fieldCandidates: string[] }> =>
        await fetchTransactionDurationFieldCandidates(esClient, {
          ...paramsQuery,
          index: indexPatternTitle ?? indices.transaction,
        })
    );
  },
});

const fieldStatsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/field_stats',
  params: t.type({
    body: t.intersection([
      t.partial({
        indexPatternTitle: t.string,
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      t.type({
        fieldsToSample: t.array(t.string),
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    stats: Array<
      import('./../../../common/correlations/field_stats_types').FieldStats
    >;
    errors: any[];
  }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { fieldsToSample, indexPatternTitle, ...params } =
      resources.params.body;

    return withApmSpan(
      'get_correlations_field_stats',
      async (): Promise<{ stats: FieldStats[]; errors: any[] }> =>
        await fetchFieldsStats(
          esClient,
          {
            ...params,
            index: indexPatternTitle ?? indices.transaction,
          },
          fieldsToSample
        )
    );
  },
});

const fieldValueStatsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_value_stats',
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
        fieldName: t.string,
        fieldValue: t.union([t.string, t.number]),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    import('./../../../common/correlations/field_stats_types').TopValuesStats
  > => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { fieldName, fieldValue, ...params } = resources.params.query;

    return withApmSpan(
      'get_correlations_field_value_stats',
      async (): Promise<TopValuesStats> =>
        await fetchFieldValueFieldStats(
          esClient,
          {
            ...params,
            index: indices.transaction,
          },
          { fieldName, fieldValue }
        )
    );
  },
});

const fieldValuePairsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/field_value_pairs',
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
        fieldCandidates: t.array(t.string),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    fieldValuePairs: Array<
      import('./../../../common/correlations/types').FieldValuePair
    >;
    errors: any[];
  }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { fieldCandidates, ...params } = resources.params.body;

    return withApmSpan(
      'get_correlations_field_value_pairs',
      async (): Promise<{ errors: any[]; fieldValuePairs: FieldValuePair[] }> =>
        await fetchTransactionDurationFieldValuePairs(
          esClient,
          {
            ...params,
            index: indices.transaction,
          },
          fieldCandidates
        )
    );
  },
});

const significantCorrelationsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/significant_correlations',
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
        fieldValuePairs: t.array(
          t.type({
            fieldName: t.string,
            fieldValue: t.union([t.string, toNumberRt]),
          })
        ),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    latencyCorrelations: Array<
      import('./../../../common/correlations/latency_correlations/types').LatencyCorrelation
    >;
    ccsWarning: boolean;
    totalDocCount: number;
    fallbackResult?: import('./../../../common/correlations/latency_correlations/types').LatencyCorrelation;
  }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { fieldValuePairs, ...params } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indices.transaction,
    };

    return withApmSpan(
      'get_significant_correlations',
      async (): Promise<{
        latencyCorrelations: LatencyCorrelation[];
        ccsWarning: boolean;
        totalDocCount: number;
      }> =>
        await fetchSignificantCorrelations(
          esClient,
          paramsWithIndex,
          fieldValuePairs
        )
    );
  },
});

const pValuesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/p_values',
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
        fieldCandidates: t.array(t.string),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    failedTransactionsCorrelations: Array<
      import('./../../../common/correlations/failed_transactions_correlations/types').FailedTransactionsCorrelation
    >;
    ccsWarning: boolean;
    fallbackResult?: import('./../../../common/correlations/failed_transactions_correlations/types').FailedTransactionsCorrelation;
  }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = (await resources.context.core).elasticsearch.client
      .asCurrentUser;

    const { fieldCandidates, ...params } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indices.transaction,
    };

    return withApmSpan(
      'get_p_values',
      async (): Promise<{
        failedTransactionsCorrelations: FailedTransactionsCorrelation[];
        ccsWarning: boolean;
      }> => await fetchPValues(esClient, paramsWithIndex, fieldCandidates)
    );
  },
});

const changePointPValuesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/change_point_p_values',
  params: t.type({
    body: t.intersection([
      t.partial({
        indexPatternTitle: t.string,
        serviceName: t.string,
        timestampField: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        fieldCandidates: t.array(t.string),
        baselineMin: toNumberRt,
        baselineMax: toNumberRt,
        deviationMin: toNumberRt,
        deviationMax: toNumberRt,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    changePoints: Array<
      import('./../../../common/correlations/change_point/types').ChangePoint
    >;
  }> => {
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const {
      fieldCandidates,
      baselineMin,
      baselineMax,
      deviationMin,
      deviationMax,
      indexPatternTitle,
      ...params
    } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indexPatternTitle ?? indices.transaction,
    };

    return withApmSpan(
      'get_change_point_p_values',
      async (): Promise<{ changePoints: ChangePoint[] }> =>
        await fetchChangePointPValues(
          esClient,
          paramsWithIndex,
          fieldCandidates,
          { baselineMin, baselineMax, deviationMin, deviationMax }
        )
    );
  },
});

const changePointFrequentItemsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/change_point_frequent_items',
  params: t.type({
    body: t.intersection([
      t.partial({
        indexPatternTitle: t.string,
        serviceName: t.string,
        timestampField: t.string,
        transactionName: t.string,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        fieldCandidates: t.array(
          t.type({
            fieldName: t.string,
            fieldValue: t.union([t.string, t.number]),
          })
        ),
        baselineMin: toNumberRt,
        baselineMax: toNumberRt,
        deviationMin: toNumberRt,
        deviationMax: toNumberRt,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ frequentItems: FrequentItems }> => {
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const {
      fieldCandidates,
      baselineMin,
      baselineMax,
      deviationMin,
      deviationMax,
      indexPatternTitle,
      ...params
    } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indexPatternTitle ?? indices.transaction,
    };

    return withApmSpan(
      'get_change_point_frequent_items',
      async (): Promise<{ frequentItems: FrequentItems }> =>
        await fetchSpikeAnalysisFrequentItems(
          esClient,
          paramsWithIndex,
          fieldCandidates,
          { baselineMin, baselineMax, deviationMin, deviationMax }
        )
    );
  },
});

export const correlationsRouteRepository = {
  ...changePointPValuesRoute,
  ...changePointFrequentItemsRoute,
  ...pValuesRoute,
  ...fieldCandidatesRoute,
  ...fieldStatsRoute,
  ...fieldValueStatsRoute,
  ...fieldValuePairsRoute,
  ...significantCorrelationsRoute,
};
