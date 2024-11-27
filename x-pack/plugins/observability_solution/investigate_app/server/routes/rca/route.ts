/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, catchError, from, of, share, switchMap, toArray } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
import {
  RootCauseAnalysisEvent,
  runRootCauseAnalysis,
} from '@kbn/observability-ai-server/root_cause_analysis';
import { z } from '@kbn/zod';
import datemath from '@elastic/datemath';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { createObservabilityEsClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { preconditionFailed } from '@hapi/boom';
import { createInvestigateAppServerRoute } from '../create_investigate_app_server_route';
import { investigationRepositoryFactory } from '../../services/investigation_repository';

export const rootCauseAnalysisRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /internal/observability/investigation/root_cause_analysis',
  options: {
    tags: [],
  },
  params: z.object({
    body: z.object({
      investigationId: z.string(),
      rangeFrom: z.string(),
      rangeTo: z.string(),
      serviceName: z.string(),
      context: z.string(),
      connectorId: z.string(),
      completeInBackground: z.boolean().optional(),
    }),
  }),
  handler: async ({
    params,
    plugins,
    request,
    context: requestContext,
    logger,
  }): Promise<Observable<ServerSentEventBase<'event', { event: RootCauseAnalysisEvent }>>> => {
    const {
      body: {
        investigationId,
        context,
        rangeFrom,
        rangeTo,
        serviceName,
        connectorId,
        completeInBackground,
      },
    } = params;

    if (!plugins.observabilityAIAssistant) {
      throw preconditionFailed('Observability AI Assistant plugin is not available');
    }

    const start = datemath.parse(rangeFrom)?.valueOf()!;
    const end = datemath.parse(rangeTo)?.valueOf()!;

    const [coreEsClient, soClient] = await Promise.all([
      (await requestContext.core).elasticsearch.client.asCurrentUser,
      (await requestContext.core).savedObjects.client,
    ]);

    const repository = investigationRepositoryFactory({ soClient, logger });

    const investigation = await repository.findById(investigationId);

    const [
      rulesClient,
      alertsClient,
      sloClient,
      inferenceClient,
      spaceId = 'default',
      esClient,
      apmIndices,
      observabilityAIAssistantClient,
    ] = await Promise.all([
      (await plugins.alerting.start()).getRulesClientWithRequest(request),
      (await plugins.ruleRegistry.start()).getRacClientWithRequest(request),
      (await plugins.slo.start()).getSloClientWithRequest(request),
      (await plugins.inference.start()).getClient({ request }),
      (await plugins.spaces?.start())?.spacesService.getSpaceId(request),
      createObservabilityEsClient({
        client: coreEsClient,
        logger,
        plugin: 'investigateApp',
      }),
      plugins.apmDataAccess.setup.getApmIndices(),
      plugins
        .observabilityAIAssistant!.start()
        .then((observabilityAIAssistantStart) =>
          observabilityAIAssistantStart.service.getClient({ request, scopes: ['observability'] })
        ),
    ]);

    const [sloSummaryIndices, logSources] = await Promise.all([
      sloClient.getSummaryIndices(),
      (
        await requestContext.core
      ).uiSettings.client.get(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID) as Promise<string[]>,
    ]);

    const next$ = runRootCauseAnalysis({
      alertsClient,
      connectorId,
      start,
      end,
      esClient,
      inferenceClient,
      indices: {
        logs: logSources,
        traces: [apmIndices.span, apmIndices.error, apmIndices.transaction],
        sloSummaries: sloSummaryIndices,
      },
      rulesClient,
      observabilityAIAssistantClient,
      serviceName,
      spaceId,
      context,
      logger,
    }).pipe(
      switchMap((event) => {
        return of({
          type: 'event' as const,
          event,
        });
      })
    );

    if (completeInBackground) {
      const shared$ = next$.pipe(share());

      shared$
        .pipe(
          toArray(),
          catchError(() => {
            return of();
          }),
          switchMap((events) => {
            return from(
              repository.save({
                ...investigation,
                rootCauseAnalysis: {
                  events: events.map(({ event }) => event),
                },
              })
            );
          })
        )
        .subscribe({
          error: (error) => {
            logger.error(`Failed to update investigation: ${error.message}`);
            logger.error(error);
          },
        });

      return shared$;
    }

    return next$;
  },
});
