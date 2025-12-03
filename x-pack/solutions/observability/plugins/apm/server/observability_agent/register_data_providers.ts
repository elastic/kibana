/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import { asMutableArray } from '../../common/utils/as_mutable_array';
import { getRandomSampler } from '../lib/helpers/get_random_sampler';
import { getApmServiceSummary } from '../routes/assistant_functions/get_apm_service_summary';
import { getApmDownstreamDependencies } from '../routes/assistant_functions/get_apm_downstream_dependencies';
import { getApmErrors } from '../routes/assistant_functions/get_observability_alert_details_context/get_apm_errors';
import { getErrorSampleDetails } from '../routes/errors/get_error_groups/get_error_sample_details';
import {
  getExitSpanChangePoints,
  getServiceChangePoints,
} from '../routes/assistant_functions/get_changepoints';
import { buildApmToolResources } from '../agent_builder/utils/build_apm_tool_resources';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import {
  AT_TIMESTAMP,
  EVENT_OUTCOME,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  STATUS_CODE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
} from '../../common/es_fields/apm';
import { getUnifiedTraceErrors } from '../routes/traces/get_unified_trace_errors';
import { getLogCategories } from '../routes/assistant_functions/get_log_categories';

export function registerDataProviders({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const { observabilityAgent } = plugins;
  if (!observabilityAgent) {
    return;
  }

  observabilityAgent.registerDataProvider(
    'apmServiceSummary',
    async ({ request, serviceName, serviceEnvironment, start, end, transactionType }) => {
      const { apmEventClient, apmAlertsClient, mlClient, esClient } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });

      return getApmServiceSummary({
        apmEventClient,
        esClient: esClient.asCurrentUser,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: {
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          start,
          end,
          'transaction.type': transactionType,
        },
      });
    }
  );

  observabilityAgent.registerDataProvider(
    'apmDownstreamDependencies',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });
      const [coreStart] = await core.getStartServices();
      const randomSampler = await getRandomSampler({ coreStart, probability: 1, request });

      return getApmDownstreamDependencies({
        apmEventClient,
        randomSampler,
        arguments: {
          serviceName,
          serviceEnvironment,
          start,
          end,
        },
      });
    }
  );

  observabilityAgent.registerDataProvider(
    'apmErrors',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });
      return getApmErrors({ apmEventClient, serviceName, serviceEnvironment, start, end });
    }
  );

  observabilityAgent.registerDataProvider(
    'apmErrorById',
    async ({ request, errorId, serviceName, serviceEnvironment, start, end, kuery = '' }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      const { error } = await getErrorSampleDetails({
        apmEventClient,
        errorId,
        serviceName,
        start,
        end,
        environment: serviceEnvironment ?? '',
        kuery,
      });

      return error;
    }
  );

  observabilityAgent.registerDataProvider(
    'apmExitSpanChangePoints',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getExitSpanChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        start,
        end,
      });
    }
  );

  observabilityAgent.registerDataProvider(
    'apmServiceChangePoints',
    async ({
      request,
      serviceName,
      serviceEnvironment,
      transactionType,
      transactionName,
      start,
      end,
    }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getServiceChangePoints({
        apmEventClient,
        serviceName,
        serviceEnvironment,
        transactionType,
        transactionName,
        start,
        end,
      });
    }
  );

  observabilityAgent.registerDataProvider(
    'apmTraceOverviewByTraceId',
    async ({ request, traceId, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      const size = 100;
      const fields = asMutableArray([
        AT_TIMESTAMP,
        TRACE_ID,
        SERVICE_NAME,
        TRANSACTION_NAME,
        SPAN_NAME,
        SPAN_TYPE,
        SPAN_SUBTYPE,
        EVENT_OUTCOME,
        STATUS_CODE,
        SPAN_DURATION,
        TRANSACTION_DURATION,
        'http.url',
        SPAN_DESTINATION_SERVICE_RESOURCE,
      ] as const);

      const response = await apmEventClient.search(
        'observability_agent_trace_overview',
        {
          apm: {
            events: [ProcessorEvent.span, ProcessorEvent.transaction],
          },
          track_total_hits: false,
          size,
          query: {
            bool: {
              filter: [...termQuery(TRACE_ID, traceId), ...rangeQuery(start, end)],
            },
          },
          fields,
          sort: [{ [AT_TIMESTAMP]: 'asc' }] as Sort,
        },
        { skipProcessorEventFilter: true }
      );

      const items =
        response.hits.hits.map((hit) => {
          const f = hit.fields as Record<string, any>;
          const ts = (f[AT_TIMESTAMP] && f[AT_TIMESTAMP][0]) || f[AT_TIMESTAMP];
          return {
            '@timestamp': ts,
            'service.name': f[SERVICE_NAME]?.[0] ?? f[SERVICE_NAME],
            name: f[SPAN_NAME]?.[0] ?? f[TRANSACTION_NAME]?.[0],
            type: f[SPAN_SUBTYPE]?.[0] ?? f[SPAN_TYPE]?.[0],
            'event.outcome': f[EVENT_OUTCOME]?.[0] ?? f[EVENT_OUTCOME],
            'status.code': f[STATUS_CODE]?.[0] ?? f[STATUS_CODE],
            'span.duration.us': f[SPAN_DURATION]?.[0],
            'transaction.duration.us': f[TRANSACTION_DURATION]?.[0],
            'http.url': (f as any)['http.url']?.[0] ?? (f as any)['http.url'],
            'span.destination.service.resource':
              f[SPAN_DESTINATION_SERVICE_RESOURCE]?.[0] ?? f[SPAN_DESTINATION_SERVICE_RESOURCE],
          };
        }) ?? [];

      const aggregatesMap = new Map<
        string,
        {
          serviceName: string;
          count: number;
          errorCount: number;
          totalDurationUs: number;
          durCount: number;
        }
      >();

      for (const it of items) {
        const serviceName = it['service.name'] ?? 'unknown';
        const agg = aggregatesMap.get(serviceName) ?? {
          serviceName,
          count: 0,
          errorCount: 0,
          totalDurationUs: 0,
          durCount: 0,
        };
        agg.count += 1;
        const outcome = it['event.outcome'];
        const status = it['status.code'];
        if (outcome === 'failure' || (typeof status === 'number' && status >= 400)) {
          agg.errorCount += 1;
        }
        const dur = it['transaction.duration.us'] ?? it['span.duration.us'];
        if (typeof dur === 'number') {
          agg.totalDurationUs += dur;
          agg.durCount += 1;
        }
        aggregatesMap.set(serviceName, agg);
      }

      const services = Array.from(aggregatesMap.values())
        .map((v) => ({
          serviceName: v.serviceName,
          count: v.count,
          errorCount: v.errorCount,
          avgDurationUs: v.durCount > 0 ? Math.round(v.totalDurationUs / v.durCount) : undefined,
        }))
        .sort((a, b) => b.count - a.count);

      return { items, services };
    }
  );

  observabilityAgent.registerDataProvider(
    'apmTraceErrorsByTraceId',
    async ({ request, traceId, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      const [coreStart, pluginStart] = await core.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      const logSourcesService =
        await pluginStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
          soClient
        );
      const logsIndex = await logSourcesService.getFlattenedLogSources();
      const scoped = coreStart.elasticsearch.client.asScoped(request);
      const currentUserEs = scoped.asCurrentUser;

      const logsClient = {
        search: async (props: { query: any; fields: string[] }) => {
          const res = await currentUserEs.search({
            index: logsIndex,
            size: 1000,
            track_total_hits: false,
            query: props.query,
            fields: props.fields,
          });
          return res as any;
        },
      };

      const { apmErrors, unprocessedOtelErrors } = await getUnifiedTraceErrors({
        apmEventClient,
        logsClient,
        traceId,
        start,
        end,
      });

      const errors = [
        ...apmErrors.map((e) => ({
          spanId: e.spanId,
          timestampUs: e.timestamp?.us,
          type: e.error.exception?.type,
          message: e.error.exception?.message ?? e.error.log?.message,
          culprit: e.error.culprit,
        })),
        ...unprocessedOtelErrors.map((e) => ({
          spanId: e.spanId,
          timestampUs: e.timestamp?.us,
          type: e.error.exception?.type,
          message: e.error.exception?.message ?? e.error.log?.message,
          culprit: e.error.culprit,
        })),
      ];

      return errors;
    }
  );

  observabilityAgent.registerDataProvider(
    'apmLogCategoriesByService',
    async ({ request, serviceName, start, end }) => {
      const { apmEventClient, esClient } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });
      const [coreStart, pluginStart] = await core.getStartServices();
      const soClient = coreStart.savedObjects.getScopedClient(request);
      const logSourcesService =
        await pluginStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
          soClient
        );

      const { logCategories } = await getLogCategories({
        apmEventClient,
        esClient: esClient.asCurrentUser,
        logSourcesService,
        arguments: {
          start,
          end,
          entities: {
            'service.name': serviceName,
          },
        },
      });

      return logCategories;
    }
  );
}
