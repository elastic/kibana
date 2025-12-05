/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import type { WaterfallSpan, WaterfallTransaction } from '../../../common/waterfall/typings';
import { getErrorSampleDetails } from '../../routes/errors/get_error_groups/get_error_sample_details';
import { getTypedSearch } from '../../utils/create_typed_es_client';
import { TRACE_ID } from '../../../common/es_fields/apm';
import { getTraceItems, type TraceDoc } from '../../routes/traces/get_trace_items';
import { parseDatemath } from '../utils/time';
import { getApmServiceSummary } from '../../routes/assistant_functions/get_apm_service_summary';
import { getApmDownstreamDependencies } from '../../routes/assistant_functions/get_apm_downstream_dependencies';
import { getApmErrors } from '../../routes/assistant_functions/get_observability_alert_details_context/get_apm_errors';
import {
  getExitSpanChangePoints,
  getServiceChangePoints,
} from '../../routes/assistant_functions/get_changepoints';
import { buildApmToolResources } from '../utils/build_apm_tool_resources';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import type { APMConfig } from '../..';

export function registerDataProviders({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
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

  observabilityAgentBuilder.registerDataProvider(
    'apmDownstreamDependencies',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient, randomSampler } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });

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

  observabilityAgentBuilder.registerDataProvider(
    'apmErrors',
    async ({ request, serviceName, serviceEnvironment, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });
      return getApmErrors({ apmEventClient, serviceName, serviceEnvironment, start, end });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmErrorDetails',
    async ({ request, errorId, serviceName, serviceEnvironment, start, end, kuery = '' }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      return getErrorSampleDetails({
        apmEventClient,
        errorId,
        serviceName,
        start: parseDatemath(start),
        end: parseDatemath(end),
        environment: serviceEnvironment ?? '',
        kuery,
      });
    }
  );

  observabilityAgentBuilder.registerDataProvider(
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

  observabilityAgentBuilder.registerDataProvider(
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

  observabilityAgentBuilder.registerDataProvider(
    'apmTraceDetails',
    async ({ request, traceId, start, end }) => {
      const { apmEventClient } = await buildApmToolResources({ core, plugins, request, logger });

      const { traceDocs, errorDocs } = await getTraceItems({
        apmEventClient,
        traceId,
        start: parseDatemath(start),
        end: parseDatemath(end),
        config: { ui: { maxTraceItems: 100 } } as unknown as APMConfig,
        logger,
      });

      const items: Array<{
        timestamp: string;
        serviceName?: string;
        traceId?: string;
        transactionId?: string;
        spanId?: string;
        transactionName?: string;
        spanName?: string;
        transactionType?: string;
        spanType?: string;
        spanSubtype?: string;
        eventOutcome?: string;
        statusCode?: number | string;
        transactionDurationUs?: number;
        spanDurationUs?: number;
        httpUrl?: string;
        parentId?: string;
        downstreamServiceResource?: string;
      }> = [];

      for (const doc of traceDocs as TraceDoc[]) {
        const timestamp = new Date(Math.floor(doc.timestamp.us / 1000)).toISOString();

        const baseTraceItem: {
          timestamp: string;
          serviceName?: string;
          traceId?: string;
          eventOutcome?: string;
          parentId?: string;
        } = {
          timestamp,
          serviceName: doc.service?.name,
          traceId: doc.trace?.id,
          eventOutcome: doc.event?.outcome,
          parentId: doc.parent?.id,
        };

        if (doc.processor.event === 'transaction') {
          const transactionDoc = doc as WaterfallTransaction;

          items.push({
            ...baseTraceItem,
            transactionId: transactionDoc.transaction?.id,
            transactionName: transactionDoc.transaction?.name,
            transactionType: transactionDoc.transaction?.type,
            transactionDurationUs: transactionDoc.transaction?.duration?.us,
            spanId: transactionDoc.span?.id,
          });
        } else {
          const spanDoc = doc as WaterfallSpan;

          items.push({
            ...baseTraceItem,
            transactionId: spanDoc.transaction?.id,
            spanId: spanDoc.span?.id,
            spanName: spanDoc.span?.name,
            spanType: spanDoc.span?.type,
            spanSubtype: spanDoc.span?.subtype,
            spanDurationUs: spanDoc.span?.duration.us,
            downstreamServiceResource: spanDoc.span?.destination?.service?.resource,
          });
        }
      }

      // Sort items by timestamp
      const traceItems = items.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1)).slice(0, 100);

      const serviceAggregatesMap = new Map<
        string,
        {
          serviceName: string;
          count: number;
          errorCount: number;
        }
      >();

      for (const item of traceItems) {
        const serviceName = item?.serviceName ?? 'unknown';
        const agg = serviceAggregatesMap.get(serviceName) ?? {
          serviceName,
          count: 0,
          errorCount: 0,
        };

        agg.count += 1;

        const outcome = item?.eventOutcome;
        if (outcome === 'failure') {
          agg.errorCount += 1;
        }
        serviceAggregatesMap.set(serviceName, agg);
      }

      const traceServiceAggregates = Array.from(serviceAggregatesMap.values())
        .map((value) => ({
          serviceName: value.serviceName,
          count: value.count,
          errorCount: value.errorCount,
        }))
        .sort((a, b) => b.count - a.count);

      const traceErrors = errorDocs
        .map((e) => {
          const exception = e.error?.exception?.[0];
          return {
            timestamp: new Date(Math.floor(e.timestamp.us / 1000)).toISOString(),
            traceId: e.trace?.id,
            transactionId: e.transaction?.id,
            spanId: e.span?.id,
            serviceName: e.service?.name,
            errorExceptionType: exception?.type,
            errorExceptionMessage: exception?.message,
            errorLogMessage: e.error?.log?.message,
          };
        })
        .filter((error) => error.timestamp)
        .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
        .slice(0, 100);

      return {
        traceItems,
        traceServiceAggregates,
        traceErrors,
      };
    }
  );

  observabilityAgentBuilder.registerDataProvider(
    'apmLogCategoriesByTrace',
    async ({ request, traceId, start, end }) => {
      const { esClient, soClient } = await buildApmToolResources({
        core,
        plugins,
        request,
        logger,
      });

      const [_, pluginStart] = await core.getStartServices();
      const logSourcesService =
        await pluginStart.logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(
          soClient
        );

      const index = await logSourcesService.getFlattenedLogSources();
      const typedSearch = getTypedSearch(esClient.asCurrentUser);

      const timeRange = {
        gte: parseDatemath(start),
        lte: parseDatemath(end),
      };

      const query = {
        bool: {
          filter: [
            { term: { [TRACE_ID]: traceId } },
            { exists: { field: 'message' } },
            {
              range: {
                '@timestamp': timeRange,
              },
            },
          ],
        },
      };

      const categorizedLogsResponse = await typedSearch({
        index,
        size: 1,
        _source: ['service.name'],
        track_total_hits: 0,
        query,
        aggs: {
          sampling: {
            random_sampler: {
              probability: 1,
            },
            aggs: {
              categories: {
                categorize_text: {
                  field: 'message',
                  size: 10,
                },
                aggs: {
                  sample: {
                    top_hits: {
                      sort: { '@timestamp': 'desc' as const },
                      size: 1,
                      fields: ['message', TRACE_ID, 'service.name'],
                    },
                  },
                },
              },
            },
          },
        },
      });

      const buckets = categorizedLogsResponse.aggregations?.sampling.categories?.buckets ?? [];

      const logCategories = buckets.map(({ doc_count: docCount, key, sample }) => {
        const hit = sample?.hits?.hits?.[0];
        const fields = hit?.fields ?? {};
        const event = unflattenKnownApmEventFields(fields) ?? {};
        const sampleMessage = String((event as any).message ?? '');

        return {
          errorCategory: key,
          docCount,
          sampleMessage,
        };
      });

      return logCategories;
    }
  );
}
