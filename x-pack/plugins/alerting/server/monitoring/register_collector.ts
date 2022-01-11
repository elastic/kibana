/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Request } from '@hapi/hapi';
import { MonitoringCollectionSetup } from '../../../monitoring_collection/server';
import { addSpaceIdToPath } from '../../../spaces/common';
import { KibanaRequest, CoreSetup } from '../../../../../src/core/server';
import { AlertingPluginsStart, EVENT_LOG_ACTIONS } from '../plugin';
import { RawRule } from '../types';
import { RuleMetric } from './types';

export function registerCollector({
  monitoringCollection,
  core,
}: {
  monitoringCollection: MonitoringCollectionSetup;
  core: CoreSetup<AlertingPluginsStart, unknown>;
}) {
  monitoringCollection.registerMetric({
    type: 'rule',
    fetch: async () => {
      const services = await core.getStartServices();

      const savedObjectClient = await services[0].savedObjects.createInternalRepository(['alert']);
      const esoClient = await services[1].encryptedSavedObjects.getClient({
        includedHiddenTypes: ['alert'],
      });
      const spacesService = await services[1].spaces?.spacesService;

      // Find all rules
      const response = await savedObjectClient.find<RawRule>({ type: 'alert', namespaces: ['*'] });
      const rules = response.saved_objects;

      const ruleMetrics: RuleMetric[] = await Promise.all(
        rules.map(async ({ attributes: rule, id, namespaces }) => {
          // Get the last execute event log
          const namespace = namespaces ? namespaces[0] : undefined;
          const {
            attributes: { apiKey },
          } = await esoClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
            namespace,
          });

          const requestHeaders: Record<string, string> = {};
          if (apiKey) {
            requestHeaders.authorization = `ApiKey ${apiKey}`;
          }

          const fakeRequest = KibanaRequest.from({
            headers: requestHeaders,
            path: '/',
            route: { settings: {} },
            url: {
              href: '/',
            },
            raw: {
              req: {
                url: '/',
              },
            },
          } as unknown as Request);
          if (namespace) {
            const path = addSpaceIdToPath('/', spacesService?.namespaceToSpaceId(namespace));
            core.http.basePath.set(fakeRequest, path);
          }
          const eventLogClient = services[1].eventLog.getClient(fakeRequest);

          const [aggResult, executeEvents, timeoutEvents, failureEvents] = await Promise.all([
            eventLogClient.getAggregatedData(
              'alert',
              [id],
              {
                types: {
                  terms: {
                    field: 'event.action',
                    size: 1000,
                  },
                },
              },
              {
                sort_order: 'desc',
                filter: `(event.action: "${EVENT_LOG_ACTIONS.execute}")`,
              }
            ),
            eventLogClient.findEventsBySavedObjectIds('alert', [id], {
              page: 1,
              per_page: 10,
              sort_order: 'desc',
              filter: `(event.action: "${EVENT_LOG_ACTIONS.execute}")`,
            }),
            eventLogClient.findEventsBySavedObjectIds('alert', [id], {
              page: 1,
              per_page: 1,
              sort_order: 'desc',
              filter: `(event.action: "${EVENT_LOG_ACTIONS.executeTimeout}")`,
            }),
            eventLogClient.findEventsBySavedObjectIds('alert', [id], {
              page: 1,
              per_page: 1,
              sort_order: 'desc',
              filter: `(event.action: "${EVENT_LOG_ACTIONS.execute}") and (event.outcome: "failure")`,
            }),
          ]);

          let totalExecutions: number = 0;
          if (aggResult) {
            totalExecutions =
              (aggResult.types as { buckets: Array<{ key: string; doc_count: number }> })
                ?.buckets[0]?.doc_count ?? 0;
          }

          // const interval = parseDuration(rule.schedule.interval as string);

          // const timeBetweenExecutes = [];
          // for (let i = 0; i < executeEvents.data.length; i++) {
          //   const event = executeEvents.data[i];
          //   const nextEvent = executeEvents.data[i + 1];
          //   if (!nextEvent) {
          //     break;
          //   }

          //   timeBetweenExecutes.push(
          //     Date.parse(event?.event?.start!) - Date.parse(nextEvent?.event?.start!)
          //   );
          // }

          // const lastExecuteTimestamps = executeEvents.data.map(
          //   (executeEvent) => executeEvent?.['@timestamp']
          // );

          // console.log({ lastExecuteTimestamps, timeBetweenExecutes, blah: mean(timeBetweenExecutes), interval });

          const lastExecute = executeEvents?.data[0];
          const lastTimeout = timeoutEvents?.data[0];
          const lastFailure = failureEvents?.data[0];

          const metrics = services[1].taskManager.getHealthMetrics(id);
          const ruleMetric = {
            name: rule.name,
            id,
            // This is in nanoseconds
            lastExecutionDuration: (lastExecute?.event?.duration ?? 0) / (1000 * 1000),
            lastExecutionTimeout:
              lastTimeout && lastTimeout['@timestamp']
                ? Date.parse(lastTimeout['@timestamp']).valueOf()
                : 0,
            averageDrift: isNaN(metrics.drift) ? 0 : metrics.drift,
            averageDuration: isNaN(metrics.duration) ? 0 : metrics.duration,
            lastErrorDate:
              lastFailure && lastFailure['@timestamp']
                ? Date.parse(lastFailure['@timestamp']).valueOf()
                : 0,
            lastErrorMessage: lastFailure?.message,
            lastErrorReason: lastFailure?.error?.message,
            totalExecutions,
          };

          return ruleMetric;
        })
      );

      return ruleMetrics;
    },
  });
}
