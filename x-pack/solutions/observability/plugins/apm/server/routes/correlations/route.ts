/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '@kbn/apm-types';
import {
  routeDefinitions,
  type DurationFieldCandidatesResponse,
  type FieldValueStatsTransactionsResponse,
  type FieldValuePairsResponse,
  type SignificantCorrelationsResponse,
  type PValuesResponse,
  type UnifiedCorrelationsRouteResponse,
} from '@kbn/apm-api-shared';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { fetchDurationFieldCandidates } from './queries/fetch_duration_field_candidates';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { fetchFieldValueFieldStats } from './queries/field_stats/fetch_field_value_field_stats';
import { fetchFieldValuePairs } from './queries/fetch_field_value_pairs';
import { fetchSignificantCorrelations } from './queries/fetch_significant_correlations';
import { fetchPValues } from './queries/fetch_p_values';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { fetchCorrelations } from './queries/fetch_correlations';

const INVALID_LICENSE = i18n.translate('xpack.apm.correlations.license.text', {
  defaultMessage:
    'To use the correlations API, you must be subscribed to an Elastic Platinum license.',
});

const fieldCandidatesTransactionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.correlations.fieldCandidatesTransactions.endpoint,
  params: routeDefinitions.correlations.fieldCandidatesTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DurationFieldCandidatesResponse> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const apmEventClient = await getApmEventClient(resources);

    const {
      query: { serviceName, transactionName, transactionType, start, end, environment, kuery },
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
  endpoint: routeDefinitions.correlations.fieldValueStatsTransactions.endpoint,
  params: routeDefinitions.correlations.fieldValueStatsTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<FieldValueStatsTransactionsResponse> => {
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

    const samplerShardSize = samplerShardSizeStr ? parseInt(samplerShardSizeStr, 10) : undefined;
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
  endpoint: routeDefinitions.correlations.fieldValuePairsTransactions.endpoint,
  params: routeDefinitions.correlations.fieldValuePairsTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<FieldValuePairsResponse> => {
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
  endpoint: routeDefinitions.correlations.significantCorrelationsTransactions.endpoint,
  params: routeDefinitions.correlations.significantCorrelationsTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<SignificantCorrelationsResponse> => {
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
      entityType: 'transaction',
    });
  },
});

const pValuesTransactionsRoute = createApmServerRoute({
  endpoint: routeDefinitions.correlations.pValuesTransactions.endpoint,
  params: routeDefinitions.correlations.pValuesTransactions.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<PValuesResponse> => {
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
      entityType: 'transaction',
    });
  },
});

/**
 * Unified correlations API
 *
 * To run exit span latency correlations, call:
 *
 *  - `POST /internal/apm/correlations`
 *  - with `entityType` set to `'exit_span'`
 *  - and `metric` set to `'latency'`
 *
 * Example request body:
 *
 * {
 *   "entityType": "exit_span",
 *   "metric": "latency",
 *   "start": "<from>",
 *   "end": "<to>",
 *   "kuery": "<optional KQL>",
 *   "percentileThreshold": 95,
 * }
 *
 * When `scope` is omitted, the API defaults to transaction-based correlations.
 */
const unifiedCorrelationsRoute = createApmServerRoute({
  endpoint: routeDefinitions.correlations.unifiedCorrelations.endpoint,
  params: routeDefinitions.correlations.unifiedCorrelations.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UnifiedCorrelationsRouteResponse> => {
    const { context } = resources;
    const { license } = await context.licensing;
    if (!isActivePlatinumLicense(license)) {
      throw Boom.forbidden(INVALID_LICENSE);
    }

    const apmEventClient = await getApmEventClient(resources);

    const {
      body: {
        entityType,
        metric,
        start,
        end,
        kuery = '',
        serviceName,
        transactionName,
        transactionType,
        fieldCandidates,
        durationMin,
        durationMax,
        percentileThreshold,
        includeHistogram = false,
        environment = ENVIRONMENT_ALL_VALUE,
      },
    } = resources.params;

    const scope: 'transactions' | 'exitSpans' =
      entityType === 'exit_span' ? 'exitSpans' : 'transactions';

    const scopeFilter =
      scope === 'exitSpans' ? [{ exists: { field: SPAN_DESTINATION_SERVICE_RESOURCE } }] : [];

    const query = {
      bool: {
        filter: [
          ...scopeFilter,
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...termQuery(TRANSACTION_NAME, transactionName),
        ] as object[],
      },
    };

    return fetchCorrelations({
      apmEventClient,
      metric,
      scope,
      start,
      end,
      environment,
      kuery,
      query,
      fieldCandidates,
      percentileThreshold,
      durationMin,
      durationMax,
      includeHistogram,
    });
  },
});

export const correlationsRouteRepository = {
  ...fieldCandidatesTransactionsRoute,
  ...fieldValueStatsTransactionsRoute,
  ...fieldValuePairsTransactionsRoute,
  ...significantCorrelationsTransactionsRoute,
  ...pValuesTransactionsRoute,
  ...unifiedCorrelationsRoute,
};
