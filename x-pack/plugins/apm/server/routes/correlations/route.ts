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

import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { isActivePlatinumLicense } from '../../../common/license_check';

import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { fetchDurationFieldCandidates } from './queries/fetch_duration_field_candidates';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { fetchFieldValueFieldStats } from './queries/field_stats/fetch_field_value_field_stats';
import { fetchFieldValuePairs } from './queries/fetch_field_value_pairs';
import { fetchSignificantCorrelations } from './queries/fetch_significant_correlations';
import { fetchPValues } from './queries/fetch_p_values';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const INVALID_LICENSE = i18n.translate('xpack.apm.correlations.license.text', {
  defaultMessage:
    'To use the correlations API, you must be subscribed to an Elastic Platinum license.',
});

const fieldCandidatesTransactionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_candidates/transactions',
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
  handler: async (resources): Promise<{ fieldCandidates: string[] }> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const apmEventClient = await getApmEventClient(resources);

    const {
      query: {
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        environment,
        kuery,
      },
    } = resources.params;

    return fetchDurationFieldCandidates({
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      apmEventClient,
    });
  },
});

const fieldValueStatsTransactionsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/correlations/field_value_stats/transactions',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        samplerShardSize: t.string,
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

    const apmEventClient = await getApmEventClient(resources);

    const {
      query: {
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        environment,
        kuery,
        fieldName,
        fieldValue,
        samplerShardSize: samplerShardSizeStr,
      },
    } = resources.params;

    const samplerShardSize = samplerShardSizeStr
      ? parseInt(samplerShardSizeStr, 10)
      : undefined;
    return fetchFieldValueFieldStats({
      apmEventClient,
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      field: {
        fieldName,
        fieldValue,
      },
      samplerShardSize,
    });
  },
});

const fieldValuePairsTransactionsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/field_value_pairs/transactions',
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

    const apmEventClient = await getApmEventClient(resources);

    const {
      body: {
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        environment,
        kuery,
        fieldCandidates,
      },
    } = resources.params;

    return fetchFieldValuePairs({
      apmEventClient,
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      fieldCandidates,
    });
  },
});

const significantCorrelationsTransactionsRoute = createApmServerRoute({
  endpoint:
    'POST /internal/apm/correlations/significant_correlations/transactions',
  params: t.type({
    body: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        durationMin: toNumberRt,
        durationMax: toNumberRt,
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
    const apmEventClient = await getApmEventClient(resources);
    const {
      body: {
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        environment,
        kuery,
        durationMin,
        durationMax,
        fieldValuePairs,
      },
    } = resources.params;

    return fetchSignificantCorrelations({
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      durationMinOverride: durationMin,
      durationMaxOverride: durationMax,
      fieldValuePairs,
    });
  },
});

const pValuesTransactionsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/correlations/p_values/transactions',
  params: t.type({
    body: t.intersection([
      t.partial({
        serviceName: t.string,
        transactionName: t.string,
        transactionType: t.string,
        durationMin: toNumberRt,
        durationMax: toNumberRt,
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
    const apmEventClient = await getApmEventClient(resources);

    const {
      body: {
        serviceName,
        transactionName,
        transactionType,
        start,
        end,
        environment,
        kuery,
        durationMin,
        durationMax,
        fieldCandidates,
      },
    } = resources.params;

    return fetchPValues({
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      durationMin,
      durationMax,
      fieldCandidates,
    });
  },
});

export const correlationsRouteRepository = {
  ...fieldCandidatesTransactionsRoute,
  ...fieldValueStatsTransactionsRoute,
  ...fieldValuePairsTransactionsRoute,
  ...significantCorrelationsTransactionsRoute,
  ...pValuesTransactionsRoute,
};
