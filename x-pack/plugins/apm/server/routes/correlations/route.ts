/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';

import { i18n } from '@kbn/i18n';
import { toNumberRt } from '@kbn/io-ts-utils/to_number_rt';

import { isActivePlatinumLicense } from '../../../common/license_check';

import { setupRequest } from '../../lib/helpers/setup_request';
import {
  fetchPValues,
  fetchSignificantCorrelations,
  fetchTransactionDurationFieldCandidates,
  fetchTransactionDurationFieldValuePairs,
} from './queries';
import { fetchFieldsStats } from './queries/field_stats/get_fields_stats';

import { withApmSpan } from '../../utils/with_apm_span';

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { createApmServerRouteRepository } from '../apm_routes/create_apm_server_route_repository';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';

const INVALID_LICENSE = i18n.translate('xpack.apm.correlations.license.text', {
  defaultMessage:
    'To use the correlations API, you must be subscribed to an Elastic Platinum license.',
});

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
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

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
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

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
  handler: async (resources) => {
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldCandidates, ...params } = resources.params.body;

    return withApmSpan(
      'get_correlations_field_value_pairs',
      async () =>
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
  handler: async (resources) => {
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldValuePairs, ...params } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indices.transaction,
    };

    return withApmSpan(
      'get_significant_correlations',
      async () =>
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
  handler: async (resources) => {
    const { context } = resources;
    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const { indices } = await setupRequest(resources);
    const esClient = resources.context.core.elasticsearch.client.asCurrentUser;

    const { fieldCandidates, ...params } = resources.params.body;

    const paramsWithIndex = {
      ...params,
      index: indices.transaction,
    };

    return withApmSpan(
      'get_p_values',
      async () => await fetchPValues(esClient, paramsWithIndex, fieldCandidates)
    );
  },
});

export const correlationsRouteRepository = createApmServerRouteRepository()
  .add(pValuesRoute)
  .add(fieldCandidatesRoute)
  .add(fieldStatsRoute)
  .add(fieldValuePairsRoute)
  .add(significantCorrelationsRoute);
