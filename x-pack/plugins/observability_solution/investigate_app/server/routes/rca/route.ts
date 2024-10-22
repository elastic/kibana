/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of, switchMap } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
import {
  RootCauseAnalysisForServiceEvent,
  runRootCauseAnalysisForService,
} from '@kbn/observability-utils-server/llm/service_rca';
import { z } from '@kbn/zod';
import datemath from '@elastic/datemath';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { createInvestigateAppServerRoute } from '../create_investigate_app_server_route';

export const rootCauseAnalysisRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /internal/observability/investigation/root_cause_analysis',
  options: {
    tags: [],
  },
  params: z.object({
    body: z.object({
      rangeFrom: z.string(),
      rangeTo: z.string(),
      serviceName: z.string(),
      context: z.string(),
      connectorId: z.string(),
    }),
  }),
  handler: async ({
    params,
    plugins,
    request,
    context: requestContext,
    logger,
  }): Promise<
    Observable<ServerSentEventBase<'event', { event: RootCauseAnalysisForServiceEvent }>>
  > => {
    const {
      body: { context, rangeFrom, rangeTo, serviceName, connectorId },
    } = params;

    const start = datemath.parse(rangeFrom)?.valueOf()!;
    const end = datemath.parse(rangeTo)?.valueOf()!;

    const [rulesClient, alertsClient, sloClient, inferenceClient, spaceId = 'default', esClient] =
      await Promise.all([
        (await plugins.alerting.start()).getRulesClientWithRequest(request),
        (await plugins.ruleRegistry.start()).getRacClientWithRequest(request),
        (await plugins.slo.start()).getSloClientWithRequest(request),
        (await plugins.inference.start()).getClient({ request }),
        (await plugins.spaces?.start())?.spacesService.getSpaceId(request),
        createObservabilityEsClient({
          client: (await requestContext.core).elasticsearch.client.asCurrentUser,
          logger,
          plugin: 'investigateApp',
        }),
      ]);

    const [sloSummaryIndices, logSources] = await Promise.all([
      sloClient.getSummaryIndices(),
      (
        await requestContext.core
      ).uiSettings.client.get(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID) as Promise<string[]>,
    ]);

    return runRootCauseAnalysisForService({
      alertsClient,
      connectorId,
      start,
      end,
      esClient,
      inferenceClient,
      logSources,
      rulesClient,
      serviceName,
      sloSummaryIndices,
      spaceId,
      context,
    }).pipe(
      switchMap((event) => {
        return of({
          type: 'event' as const,
          event,
        });
      })
    );
  },
});
