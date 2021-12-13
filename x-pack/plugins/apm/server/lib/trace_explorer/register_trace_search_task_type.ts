/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mapValues } from 'lodash';
import { Request } from '@hapi/hapi';
import pLimit from 'p-limit';
import { Observable } from 'rxjs';
import { APMConfig } from '../..';
import { CoreSetup, KibanaRequest } from '../../../../../../src/core/server';
import { TaskManagerSetupContract } from '../../../../task_manager/server';
import { APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE } from '../../../common/apm_saved_object_constants';
import { TraceSearchType } from '../../../common/trace_explorer';
import {
  TraceSearchParams,
  TraceSearchState,
} from '../../../common/trace_explorer/trace_data_search_state';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { formatTraceDataForSavedObject } from '../../routes/trace_explorer/format_trace_data_for_saved_object';
import { getTraceSearchTaskId } from '../../routes/trace_explorer/get_task_id';
import { getTraceIdsFromEql } from '../../routes/trace_explorer/get_trace_ids_from_eql';
import { getTraceIdsFromKql } from '../../routes/trace_explorer/get_trace_ids_from_kql';
import { getTraceSearchState } from '../../routes/trace_explorer/get_trace_search_state';
import { APMEventClient } from '../helpers/create_es_client/create_apm_event_client';
import { APM_TRACE_SEARCH_TASK_TYPE_NAME } from './constants';
import { traceDistributionFetcher } from './trace_distribution_fetcher';
import { traceOperationsFetcher } from './trace_operations_fetcher';
import { traceSamplesFetcher } from './trace_samples_fetcher';

export async function registerTraceSearchTaskType({
  taskManagerSetup,
  coreSetup,
  config,
}: {
  taskManagerSetup: TaskManagerSetupContract;
  coreSetup: CoreSetup;
  config: APMConfig;
}) {
  taskManagerSetup.registerTaskDefinitions({
    [APM_TRACE_SEARCH_TASK_TYPE_NAME]: {
      title: 'Execute long-running search for trace data',
      createTaskRunner: (context) => {
        const { apiKey, ...params } = context.taskInstance
          .params as TraceSearchParams & { apiKey: string };

        const { start, end, environment, pageSize, query, type } = params;

        const limiter = pLimit(1);

        return {
          run: async () => {
            const fakeRequest = KibanaRequest.from({
              headers: {
                authorization: `ApiKey ${apiKey}`,
              },
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

            fakeRequest.events.aborted$ = new Observable();

            const [coreStart] = await coreSetup.getStartServices();

            coreStart.http.basePath.set(fakeRequest, '/');

            const taskId = getTraceSearchTaskId(params);

            const savedObjectsClient =
              coreStart.savedObjects.getScopedClient(fakeRequest);
            const esClient =
              coreStart.elasticsearch.client.asScoped(fakeRequest);

            let traceState: TraceSearchState;

            const updateTraceState = (
              fn: (prevTraceState: TraceSearchState) => TraceSearchState
            ) => {
              return limiter(async () => {
                traceState = await fn(traceState);
                await savedObjectsClient.update(
                  APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE,
                  taskId,
                  formatTraceDataForSavedObject(traceState)
                );
              });
            };

            let apmEventClient: APMEventClient;

            // eslint-disable-next-line prefer-const
            [traceState, apmEventClient] = await Promise.all([
              getTraceSearchState({
                taskId,
                savedObjectsClient,
              }),
              getApmIndices({
                config,
                savedObjectsClient,
              }).then((indices) => {
                return new APMEventClient({
                  debug: false,
                  esClient: esClient.asCurrentUser,
                  indices,
                  options: {
                    includeFrozen: false,
                  },
                  request: fakeRequest,
                });
              }),
            ]);

            const numTraceIds = pageSize;

            await updateTraceState((prev) => {
              const nextFragments = Object.fromEntries(
                Object.entries(prev.fragments).map(([name, fragment]) => {
                  return [
                    name,
                    { ...fragment, isPartial: true, isRunning: true },
                  ];
                })
              );

              return {
                ...prev,
                fragments: nextFragments,
              } as TraceSearchState;
            });
            let traceIds: string[] = [];
            let errorMessage: string | undefined;

            try {
              traceIds =
                type === TraceSearchType.eql
                  ? await getTraceIdsFromEql({
                      start,
                      end,
                      environment,
                      query,
                      numTraceIds,
                      apmEventClient,
                    })
                  : await getTraceIdsFromKql({
                      start,
                      end,
                      environment,
                      query,
                      numTraceIds,
                      apmEventClient,
                    });
            } catch (err) {
              traceIds = [];
              errorMessage = err.toString();
            }

            if (!traceIds.length) {
              await updateTraceState((prev) => {
                return {
                  ...prev,
                  fragments: mapValues(prev.fragments, (fragment) => ({
                    ...fragment,
                    isRunning: false,
                    isPartial: false,
                  })) as any,
                  isError: !!errorMessage,
                  error: errorMessage,
                };
              });
              return {
                state: {},
              };
            }

            await updateTraceState((prev) => ({
              ...prev,
              foundTraceCount: traceIds.length + prev.foundTraceCount,
            }));

            const fetches: Record<string, Promise<any>> = {
              samples: traceSamplesFetcher({
                prev: traceState.fragments.samples.data,
                apmEventClient,
                start,
                end,
                environment,
                traceIds,
              }),
              distribution: traceDistributionFetcher({
                prev: traceState.fragments.distribution.data,
                apmEventClient,
                start,
                end,
                environment,
                traceIds,
              }),
              operations: traceOperationsFetcher({
                prev: traceState.fragments.operations.data,
                apmEventClient,
                start,
                end,
                environment,
                traceIds,
              }),
            };

            const promises = Object.values(fetches);

            // eslint-disable-next-line guard-for-in
            for (const fragmentName in fetches) {
              const fetcher = fetches[fragmentName as keyof typeof fetches];
              promises.push(
                fetcher.then(
                  (result) => {
                    return updateTraceState((prev) => {
                      return {
                        ...prev,
                        fragments: {
                          ...prev.fragments,
                          [fragmentName as keyof typeof fetches]: {
                            ...prev.fragments[
                              fragmentName as keyof typeof prev.fragments
                            ],
                            isRunning: false,
                            isPartial: false,
                            data: result,
                          },
                        },
                      };
                    });
                  },
                  (err) => {
                    return updateTraceState((prev) => {
                      return {
                        ...prev,
                        fragments: {
                          ...prev.fragments,
                          [fragmentName as keyof typeof fetches]: {
                            ...prev.fragments[
                              fragmentName as keyof typeof prev.fragments
                            ],
                            isRunning: false,
                            isPartial: false,
                            isError: true,
                            error: err.toString(),
                          },
                        },
                      };
                    });
                  }
                )
              );
            }

            await Promise.all(promises);

            await updateTraceState((prev) => {
              return {
                ...prev,
                isRunning: false,
                isPartial: false,
                isError: Object.values(prev.fragments).some(
                  (fragment) => fragment.isError
                ),
                error: Object.values(prev.fragments).find(
                  (fragment) => fragment.isError
                )?.error,
              };
            });

            return {
              state: {},
            };
          },
        };
      },
    },
  });
}
