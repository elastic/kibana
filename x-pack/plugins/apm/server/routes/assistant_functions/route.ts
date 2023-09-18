/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { omit } from 'lodash';
import { ApmDocumentType } from '../../../common/document_type';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { RollupInterval } from '../../../common/rollup';
import { ServiceHealthStatus } from '../../../common/service_health_status';
import type { APMError } from '../../../typings/es_schemas/ui/apm_error';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getServicesItems } from '../services/get_services/get_services_items';
import {
  CorrelationValue,
  correlationValuesRouteRt,
  getApmCorrelationValues,
} from './get_apm_correlation_values';
import {
  downstreamDependenciesRouteRt,
  getAssistantDownstreamDependencies,
  type APMDownstreamDependency,
} from './get_apm_downstream_dependencies';
import { errorRouteRt, getApmErrorDocument } from './get_apm_error_document';
import {
  getApmServiceSummary,
  serviceSummaryRouteRt,
  type ServiceSummary,
} from './get_apm_service_summary';
import {
  getApmTimeseries,
  getApmTimeseriesRt,
  type ApmTimeseries,
} from './get_apm_timeseries';

const getApmTimeSeriesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_apm_timeseries',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    body: getApmTimeseriesRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
  }> => {
    const body = resources.params.body;

    const apmEventClient = await getApmEventClient(resources);

    const timeseries = await getApmTimeseries({
      apmEventClient,
      arguments: body,
    });

    return {
      content: timeseries.map(
        (series): Omit<ApmTimeseries, 'data'> => omit(series, 'data')
      ),
      data: timeseries,
    };
  },
});

const getApmServiceSummaryRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_service_summary',
  options: {
    tags: ['access:apm', 'access:ai_assistant'],
  },
  params: t.type({
    query: serviceSummaryRouteRt,
  }),
  handler: async (
    resources
  ): Promise<{
    content: ServiceSummary;
  }> => {
    const args = resources.params.query;

    const { context, request, plugins, logger } = resources;

    const [
      apmEventClient,
      annotationsClient,
      esClient,
      apmAlertsClient,
      mlClient,
    ] = await Promise.all([
      getApmEventClient(resources),
      plugins.observability.setup.getScopedAnnotationsClient(context, request),
      context.core.then(
        (coreContext): ElasticsearchClient =>
          coreContext.elasticsearch.client.asCurrentUser
      ),
      getApmAlertsClient(resources),
      getMlClient(resources),
    ]);

    return {
      content: await getApmServiceSummary({
        apmEventClient,
        annotationsClient,
        esClient,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: args,
      }),
    };
  },
});

const getDownstreamDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ content: APMDownstreamDependency[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { query } = params;

    return {
      content: await getAssistantDownstreamDependencies({
        arguments: query,
        apmEventClient,
      }),
    };
  },
});

const getApmCorrelationValuesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_correlation_values',
  params: t.type({
    body: correlationValuesRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ content: CorrelationValue[] }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { body } = params;

    return {
      content: await getApmCorrelationValues({
        arguments: body,
        apmEventClient,
      }),
    };
  },
});

const getApmErrorDocRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/assistant/get_error_document',
  params: t.type({
    query: errorRouteRt,
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{ content: Partial<APMError> | undefined }> => {
    const { params } = resources;
    const apmEventClient = await getApmEventClient(resources);
    const { query } = params;

    return {
      content: await getApmErrorDocument({
        apmEventClient,
        arguments: query,
      }),
    };
  },
});

interface ApmServicesListItem {
  'service.name': string;
  'agent.name'?: string;
  'transaction.type'?: string;
  alertsCount: number;
  healthStatus: ServiceHealthStatus;
  'service.environment'?: string[];
}

type ApmServicesListContent = ApmServicesListItem[];

const getApmServicesListRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/assistant/get_services_list',
  params: t.type({
    body: t.intersection([
      t.type({
        start: t.string,
        end: t.string,
      }),
      t.partial({
        'service.environment': t.string,
        healthStatus: t.array(
          t.union([
            t.literal(ServiceHealthStatus.unknown),
            t.literal(ServiceHealthStatus.healthy),
            t.literal(ServiceHealthStatus.warning),
            t.literal(ServiceHealthStatus.critical),
          ])
        ),
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources): Promise<{ content: ApmServicesListContent }> => {
    const { params } = resources;
    const { body } = params;

    const { healthStatus } = body;

    const [apmEventClient, apmAlertsClient, mlClient, randomSampler] =
      await Promise.all([
        getApmEventClient(resources),
        getApmAlertsClient(resources),
        getMlClient(resources),
        getRandomSampler({
          security: resources.plugins.security,
          probability: 1,
          request: resources.request,
        }),
      ]);

    const start = datemath.parse(body.start)?.valueOf()!;
    const end = datemath.parse(body.end)?.valueOf()!;

    const serviceItems = await getServicesItems({
      apmAlertsClient,
      apmEventClient,
      documentType: ApmDocumentType.TransactionMetric,
      start,
      end,
      environment: body['service.environment'] || ENVIRONMENT_ALL.value,
      kuery: '',
      logger: resources.logger,
      randomSampler,
      rollupInterval: RollupInterval.OneMinute,
      serviceGroup: null,
      mlClient,
    });

    let mappedItems = serviceItems.items.map((item): ApmServicesListItem => {
      return {
        'service.name': item.serviceName,
        'agent.name': item.agentName,
        alertsCount: item.alertsCount ?? 0,
        healthStatus: item.healthStatus ?? ServiceHealthStatus.unknown,
        'service.environment': item.environments,
        'transaction.type': item.transactionType,
      };
    });

    if (healthStatus && healthStatus.length) {
      mappedItems = mappedItems.filter((item): boolean =>
        healthStatus.includes(item.healthStatus)
      );
    }

    return {
      content: mappedItems,
    };
  },
});

export const assistantRouteRepository = {
  ...getApmTimeSeriesRoute,
  ...getApmServiceSummaryRoute,
  ...getApmErrorDocRoute,
  ...getApmCorrelationValuesRoute,
  ...getDownstreamDependenciesRoute,
  ...getApmServicesListRoute,
};
